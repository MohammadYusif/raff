// src/app/api/admin/cleanup-duplicate-merchants/route.ts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

/**
 * Admin endpoint to merge duplicate Salla merchants
 * This happens when Salla changes demo store IDs or when testing
 *
 * Strategy:
 * 1. Find merchants with same sallaStoreUrl (same domain, different subdomain)
 * 2. Keep the NEWEST merchant (most recent createdAt)
 * 3. Reassign all products, categories, orders, click tracking to the kept merchant
 * 4. Delete old merchant records
 */

export async function POST(request: NextRequest) {
  try {
    const { dryRun = true } = await request.json().catch(() => ({ dryRun: true }));

    // Find all Salla merchants grouped by domain
    const merchants = await prisma.merchant.findMany({
      where: {
        sallaStoreUrl: { not: null },
      },
      select: {
        id: true,
        name: true,
        sallaStoreUrl: true,
        sallaStoreId: true,
        createdAt: true,
        userId: true,
        _count: {
          select: {
            products: true,
            orders: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    // Group by base domain (e.g., demostore.salla.sa)
    const groupedByDomain = merchants.reduce((acc, merchant) => {
      if (!merchant.sallaStoreUrl) return acc;

      const url = new URL(merchant.sallaStoreUrl);
      const baseDomain = url.hostname.split('.').slice(-2).join('.'); // e.g., salla.sa

      if (!acc[baseDomain]) acc[baseDomain] = [];
      acc[baseDomain].push(merchant);
      return acc;
    }, {} as Record<string, typeof merchants>);

    const duplicateGroups = Object.entries(groupedByDomain)
      .filter(([_, merchants]) => merchants.length > 1)
      .map(([domain, merchants]) => ({ domain, merchants }));

    if (duplicateGroups.length === 0) {
      return NextResponse.json({
        status: "success",
        message: "No duplicate merchants found",
        duplicateGroups: [],
      });
    }

    const mergeOperations = [];

    for (const { domain, merchants } of duplicateGroups) {
      // Keep the NEWEST merchant (first in array since we ordered by createdAt desc)
      const keepMerchant = merchants[0];
      const deleteMerchants = merchants.slice(1);

      const operation = {
        domain,
        keepMerchant: {
          id: keepMerchant.id,
          name: keepMerchant.name,
          storeUrl: keepMerchant.sallaStoreUrl,
          storeId: keepMerchant.sallaStoreId,
          createdAt: keepMerchant.createdAt,
          products: keepMerchant._count.products,
          orders: keepMerchant._count.orders,
        },
        mergeMerchants: deleteMerchants.map(m => ({
          id: m.id,
          name: m.name,
          storeUrl: m.sallaStoreUrl,
          storeId: m.sallaStoreId,
          createdAt: m.createdAt,
          products: m._count.products,
          orders: m._count.orders,
        })),
      };

      mergeOperations.push(operation);

      if (!dryRun) {
        // Actually perform the merge in a transaction
        await prisma.$transaction(async (tx) => {
          const deleteIds = deleteMerchants.map(m => m.id);

          // 1. Reassign all products
          await tx.product.updateMany({
            where: { merchantId: { in: deleteIds } },
            data: { merchantId: keepMerchant.id },
          });

          // 2. Reassign all categories
          await tx.category.updateMany({
            where: {
              slug: {
                in: deleteMerchants.flatMap(m =>
                  [`salla-${m.id}-%`]
                )
              }
            },
            data: {
              // Categories need slug update too since they include merchantId
              // We'll delete and let them be recreated on next sync
            },
          });

          // Actually, let's just delete old merchant categories
          // They'll be recreated on next sync with correct merchantId
          await tx.category.deleteMany({
            where: {
              slug: {
                contains: deleteMerchants.map(m => `salla-${m.id}-`).join('|')
              }
            }
          });

          // 3. Reassign all orders
          await tx.order.updateMany({
            where: { merchantId: { in: deleteIds } },
            data: { merchantId: keepMerchant.id },
          });

          // 4. Reassign click tracking
          await tx.clickTracking.updateMany({
            where: { merchantId: { in: deleteIds } },
            data: { merchantId: keepMerchant.id },
          });

          // 5. Reassign commissions
          await tx.commission.updateMany({
            where: { merchantId: { in: deleteIds } },
            data: { merchantId: keepMerchant.id },
          });

          // 6. Delete the old merchant records
          await tx.merchant.deleteMany({
            where: { id: { in: deleteIds } },
          });

          // 7. Also delete associated users if they have no other merchants
          for (const deleteMerchant of deleteMerchants) {
            if (deleteMerchant.userId) {
              const otherMerchants = await tx.merchant.count({
                where: { userId: deleteMerchant.userId },
              });

              if (otherMerchants === 0) {
                await tx.user.delete({
                  where: { id: deleteMerchant.userId },
                });
              }
            }
          }
        });
      }
    }

    return NextResponse.json({
      status: dryRun ? "dry-run" : "success",
      message: dryRun
        ? "Dry run completed - no changes made. Send {\"dryRun\": false} to apply changes."
        : "Duplicate merchants merged successfully",
      duplicateGroups: mergeOperations,
      totalDuplicatesFound: mergeOperations.reduce((sum, op) => sum + op.mergeMerchants.length, 0),
    });

  } catch (error) {
    console.error("Error cleaning up duplicate merchants:", error);
    return NextResponse.json(
      {
        error: "Failed to cleanup duplicate merchants",
        details: error instanceof Error ? error.message : "Unknown error"
      },
      { status: 500 }
    );
  }
}

export async function GET() {
  return NextResponse.json({
    endpoint: "POST /api/admin/cleanup-duplicate-merchants",
    description: "Merge duplicate Salla merchants that have same domain but different store IDs",
    usage: {
      dryRun: "POST with {\"dryRun\": true} to preview changes",
      apply: "POST with {\"dryRun\": false} to apply changes",
    },
  });
}

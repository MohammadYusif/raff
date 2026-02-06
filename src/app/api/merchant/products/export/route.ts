// src/app/api/merchant/products/export/route.ts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireMerchant } from "@/lib/auth/guards";
import { createLogger } from "@/lib/utils/logger";

const logger = createLogger("api-merchant-products-export");


export async function GET(request: NextRequest) {
  try {
    const auth = await requireMerchant("api");
    if ("response" in auth) return auth.response;
    const { session } = auth;
    const merchantId = session.user.merchantId;
    if (!merchantId) {
      return NextResponse.json(
        { error: "Merchant profile not linked" },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(request.url);
    const format = searchParams.get("format") || "csv";

    // Fetch all products with analytics
    const products = await prisma.product.findMany({
      where: { merchantId },
      include: {
        category: {
          select: {
            name: true,
            nameAr: true,
          },
        },
        clickTrackings: {
          select: { id: true },
        },
        outboundClickEvents: {
          select: { id: true },
        },
        orders: {
          select: {
            id: true,
            totalPrice: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    // Generate CSV
    if (format === "csv") {
      // Helper function to prevent CSV injection
      const sanitizeCSVValue = (value: string): string => {
        // Escape double quotes
        let sanitized = value.replace(/"/g, '""');

        // Strip leading/trailing whitespace to expose hidden formula characters
        const trimmed = sanitized.trim();

        // Prevent CSV injection: Check if trimmed value starts with dangerous characters
        // Also block if original starts with whitespace followed by formula character
        if (/^[=+\-@]/.test(trimmed) || /^\s+[=+\-@]/.test(sanitized)) {
          sanitized = "'" + sanitized;
        }

        return `"${sanitized}"`;
      };

      const headers = [
        "ID",
        "Title",
        "Title (Arabic)",
        "Category",
        "Price",
        "Currency",
        "Is Active",
        "In Stock",
        "Views",
        "Clicks",
        "Orders",
        "Revenue",
        "Conversion Rate (%)",
        "Created At",
        "Updated At",
      ];

      const csvRows = products.map((product) => {
        const views = product.clickTrackings.length;
        const clicks = product.outboundClickEvents.length;
        const orders = product.orders.length;
        const revenue = product.orders.reduce(
          (sum, order) => sum + Number(order.totalPrice),
          0
        );
        const conversionRate =
          clicks > 0 ? ((orders / clicks) * 100).toFixed(2) : "0.00";

        return [
          product.id,
          sanitizeCSVValue(product.title),
          product.titleAr ? sanitizeCSVValue(product.titleAr) : "",
          product.category?.name ? sanitizeCSVValue(product.category.name) : "",
          Number(product.price).toFixed(2),
          product.currency,
          product.isActive ? "Yes" : "No",
          product.inStock ? "Yes" : "No",
          views,
          clicks,
          orders,
          revenue.toFixed(2),
          conversionRate,
          product.createdAt.toISOString(),
          product.updatedAt.toISOString(),
        ];
      });

      const csv = [
        headers.join(","),
        ...csvRows.map((row) => row.join(",")),
      ].join("\n");

      const blob = Buffer.from("\uFEFF" + csv, "utf-8"); // Add BOM for Excel UTF-8 support

      return new NextResponse(blob, {
        headers: {
          "Content-Type": "text/csv; charset=utf-8",
          "Content-Disposition": `attachment; filename="products-export-${new Date().toISOString().split("T")[0]}.csv"`,
        },
      });
    }

    return NextResponse.json(
      { error: "Unsupported format" },
      { status: 400 }
    );
  } catch (error) {
    logger.error("Error exporting products", { error: error instanceof Error ? error.message : String(error) });
    return NextResponse.json(
      { error: "Failed to export products" },
      { status: 500 }
    );
  }
}

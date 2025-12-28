// prisma/seed.ts
import { PrismaClient, MerchantStatus, OrderStatus, UserRole } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting database seed...');

  // Clean existing data
  console.log('🧹 Cleaning existing data...');
  await prisma.trendingLog.deleteMany();
  await prisma.order.deleteMany();
  await prisma.product.deleteMany();
  await prisma.category.deleteMany();
  await prisma.merchant.deleteMany();
  await prisma.user.deleteMany();

  // ============================================
  // CATEGORIES
  // ============================================
  console.log('📁 Creating categories...');
  const categories = await Promise.all([
    prisma.category.create({
      data: {
        name: 'Electronics',
        nameAr: 'إلكترونيات',
        slug: 'electronics',
        description: 'Latest electronic devices and gadgets',
        descriptionAr: 'أحدث الأجهزة الإلكترونية والتقنية',
        icon: '📱',
        order: 1,
        isActive: true,
      },
    }),
    prisma.category.create({
      data: {
        name: 'Fashion',
        nameAr: 'أزياء',
        slug: 'fashion',
        description: 'Trendy clothing and accessories',
        descriptionAr: 'ملابس وإكسسوارات عصرية',
        icon: '👗',
        order: 2,
        isActive: true,
      },
    }),
    prisma.category.create({
      data: {
        name: 'Home & Kitchen',
        nameAr: 'منزل ومطبخ',
        slug: 'home-kitchen',
        description: 'Everything for your home',
        descriptionAr: 'كل ما تحتاجه لمنزلك',
        icon: '🏠',
        order: 3,
        isActive: true,
      },
    }),
    prisma.category.create({
      data: {
        name: 'Beauty & Health',
        nameAr: 'جمال وصحة',
        slug: 'beauty-health',
        description: 'Beauty and wellness products',
        descriptionAr: 'منتجات الجمال والعناية',
        icon: '💄',
        order: 4,
        isActive: true,
      },
    }),
    prisma.category.create({
      data: {
        name: 'Sports & Outdoors',
        nameAr: 'رياضة وخارجية',
        slug: 'sports-outdoors',
        description: 'Sports equipment and outdoor gear',
        descriptionAr: 'معدات رياضية وأنشطة خارجية',
        icon: '⚽',
        order: 5,
        isActive: true,
      },
    }),
    prisma.category.create({
      data: {
        name: 'Books & Stationery',
        nameAr: 'كتب وقرطاسية',
        slug: 'books-stationery',
        description: 'Books and office supplies',
        descriptionAr: 'كتب ومستلزمات مكتبية',
        icon: '📚',
        order: 6,
        isActive: true,
      },
    }),
  ]);

  console.log(`✅ Created ${categories.length} categories`);

  // ============================================
  // MERCHANTS
  // ============================================
  console.log('🏪 Creating merchants...');
  const merchants = await Promise.all([
    prisma.merchant.create({
      data: {
        name: 'Tech Galaxy',
        nameAr: 'تك جالاكسي',
        email: 'contact@techgalaxy.sa',
        phone: '+966501234567',
        description: 'Your premium destination for latest tech products',
        descriptionAr: 'وجهتك المميزة لأحدث المنتجات التقنية',
        sallaStoreId: 'store_tech_galaxy_001',
        sallaStoreUrl: 'https://techgalaxy.salla.sa',
        status: MerchantStatus.APPROVED,
        approvedAt: new Date(),
        isActive: true,
        autoSyncProducts: true,
      },
    }),
    prisma.merchant.create({
      data: {
        name: 'Fashion House',
        nameAr: 'بيت الأزياء',
        email: 'info@fashionhouse.sa',
        phone: '+966502345678',
        description: 'Exclusive fashion and accessories',
        descriptionAr: 'أزياء وإكسسوارات حصرية',
        sallaStoreId: 'store_fashion_house_002',
        sallaStoreUrl: 'https://fashionhouse.salla.sa',
        status: MerchantStatus.APPROVED,
        approvedAt: new Date(),
        isActive: true,
        autoSyncProducts: true,
      },
    }),
    prisma.merchant.create({
      data: {
        name: 'Home Essentials',
        nameAr: 'أساسيات المنزل',
        email: 'hello@homeessentials.sa',
        phone: '+966503456789',
        description: 'Quality home and kitchen products',
        descriptionAr: 'منتجات منزلية ومطبخية عالية الجودة',
        sallaStoreId: 'store_home_essentials_003',
        sallaStoreUrl: 'https://homeessentials.salla.sa',
        status: MerchantStatus.APPROVED,
        approvedAt: new Date(),
        isActive: true,
        autoSyncProducts: true,
      },
    }),
    prisma.merchant.create({
      data: {
        name: 'Beauty Corner',
        nameAr: 'ركن الجمال',
        email: 'care@beautycorner.sa',
        phone: '+966504567890',
        description: 'Premium beauty and skincare',
        descriptionAr: 'منتجات جمال وعناية بالبشرة مميزة',
        sallaStoreId: 'store_beauty_corner_004',
        sallaStoreUrl: 'https://beautycorner.salla.sa',
        status: MerchantStatus.APPROVED,
        approvedAt: new Date(),
        isActive: true,
        autoSyncProducts: true,
      },
    }),
    prisma.merchant.create({
      data: {
        name: 'Sports Pro',
        nameAr: 'سبورتس برو',
        email: 'support@sportspro.sa',
        phone: '+966505678901',
        description: 'Professional sports equipment',
        descriptionAr: 'معدات رياضية احترافية',
        sallaStoreId: 'store_sports_pro_005',
        sallaStoreUrl: 'https://sportspro.salla.sa',
        status: MerchantStatus.APPROVED,
        approvedAt: new Date(),
        isActive: true,
        autoSyncProducts: true,
      },
    }),
  ]);

  console.log(`✅ Created ${merchants.length} merchants`);

  // ============================================
  // PRODUCTS
  // ============================================
  console.log('📦 Creating products...');
  
  const products = await Promise.all([
    // Electronics - Tech Galaxy
    prisma.product.create({
      data: {
        title: 'Wireless Noise-Cancelling Headphones',
        titleAr: 'سماعات لاسلكية بخاصية إلغاء الضوضاء',
        description: 'Premium wireless headphones with active noise cancellation, 30-hour battery life, and superior sound quality.',
        descriptionAr: 'سماعات لاسلكية فاخرة مع خاصية إلغاء الضوضاء النشطة، بطارية تدوم 30 ساعة، وجودة صوت فائقة.',
        price: 899.00,
        originalPrice: 1299.00,
        currency: 'SAR',
        images: ['/products/headphones-1.jpg', '/products/headphones-2.jpg'],
        thumbnail: '/products/headphones-1.jpg',
        categoryId: categories[0].id, // Electronics
        sallaProductId: 'prod_headphones_001',
        sallaUrl: 'https://techgalaxy.salla.sa/product/wireless-headphones',
        merchantId: merchants[0].id,
        isActive: true,
        inStock: true,
        quantity: 45,
        trendingScore: 95.5,
        viewCount: 1240,
        clickCount: 340,
        orderCount: 89,
        slug: 'wireless-noise-cancelling-headphones',
        tags: ['wireless', 'headphones', 'audio', 'premium'],
        metaTitle: 'Premium Wireless Headphones | Raff',
        metaDescription: 'Get the best wireless headphones with noise cancellation',
      },
    }),
    prisma.product.create({
      data: {
        title: 'Smart Watch Series 8',
        titleAr: 'ساعة ذكية سلسلة 8',
        description: 'Advanced fitness tracking, heart rate monitoring, GPS, and seamless smartphone integration.',
        descriptionAr: 'تتبع متقدم للياقة البدنية، مراقبة معدل ضربات القلب، GPS، وتكامل سلس مع الهواتف الذكية.',
        price: 1499.00,
        originalPrice: 1999.00,
        currency: 'SAR',
        images: ['/products/smartwatch-1.jpg'],
        thumbnail: '/products/smartwatch-1.jpg',
        categoryId: categories[0].id,
        sallaProductId: 'prod_smartwatch_002',
        sallaUrl: 'https://techgalaxy.salla.sa/product/smart-watch',
        merchantId: merchants[0].id,
        isActive: true,
        inStock: true,
        quantity: 28,
        trendingScore: 88.3,
        viewCount: 980,
        clickCount: 265,
        orderCount: 67,
        slug: 'smart-watch-series-8',
        tags: ['smartwatch', 'fitness', 'health', 'tech'],
      },
    }),
    prisma.product.create({
      data: {
        title: 'Portable Bluetooth Speaker',
        titleAr: 'سماعة بلوتوث محمولة',
        description: 'Waterproof portable speaker with 360° sound, 12-hour battery, and deep bass.',
        descriptionAr: 'سماعة محمولة مقاومة للماء مع صوت 360 درجة، بطارية 12 ساعة، وصوت جهير عميق.',
        price: 349.00,
        currency: 'SAR',
        images: ['/products/speaker-1.jpg'],
        thumbnail: '/products/speaker-1.jpg',
        categoryId: categories[0].id,
        sallaProductId: 'prod_speaker_003',
        sallaUrl: 'https://techgalaxy.salla.sa/product/bluetooth-speaker',
        merchantId: merchants[0].id,
        isActive: true,
        inStock: true,
        quantity: 120,
        trendingScore: 76.8,
        viewCount: 650,
        clickCount: 180,
        orderCount: 45,
        slug: 'portable-bluetooth-speaker',
        tags: ['speaker', 'bluetooth', 'portable', 'audio'],
      },
    }),

    // Fashion - Fashion House
    prisma.product.create({
      data: {
        title: 'Premium Leather Handbag',
        titleAr: 'حقيبة يد جلدية فاخرة',
        description: 'Genuine leather handbag with elegant design, multiple compartments, and adjustable strap.',
        descriptionAr: 'حقيبة يد من الجلد الطبيعي بتصميم أنيق، أقسام متعددة، وحزام قابل للتعديل.',
        price: 799.00,
        originalPrice: 1199.00,
        currency: 'SAR',
        images: ['/products/handbag-1.jpg'],
        thumbnail: '/products/handbag-1.jpg',
        categoryId: categories[1].id,
        sallaProductId: 'prod_handbag_004',
        sallaUrl: 'https://fashionhouse.salla.sa/product/leather-handbag',
        merchantId: merchants[1].id,
        isActive: true,
        inStock: true,
        quantity: 35,
        trendingScore: 92.1,
        viewCount: 1100,
        clickCount: 310,
        orderCount: 78,
        slug: 'premium-leather-handbag',
        tags: ['handbag', 'leather', 'fashion', 'luxury'],
      },
    }),
    prisma.product.create({
      data: {
        title: 'Designer Sunglasses Collection',
        titleAr: 'مجموعة نظارات شمسية مصممة',
        description: 'UV protection, polarized lenses, and timeless style.',
        descriptionAr: 'حماية من الأشعة فوق البنفسجية، عدسات مستقطبة، وأناقة خالدة.',
        price: 549.00,
        currency: 'SAR',
        images: ['/products/sunglasses-1.jpg'],
        thumbnail: '/products/sunglasses-1.jpg',
        categoryId: categories[1].id,
        sallaProductId: 'prod_sunglasses_005',
        sallaUrl: 'https://fashionhouse.salla.sa/product/designer-sunglasses',
        merchantId: merchants[1].id,
        isActive: true,
        inStock: true,
        quantity: 60,
        trendingScore: 71.4,
        viewCount: 520,
        clickCount: 145,
        orderCount: 38,
        slug: 'designer-sunglasses-collection',
        tags: ['sunglasses', 'fashion', 'accessories', 'designer'],
      },
    }),

    // Home & Kitchen - Home Essentials
    prisma.product.create({
      data: {
        title: 'Smart Coffee Maker',
        titleAr: 'صانعة قهوة ذكية',
        description: 'WiFi-enabled coffee maker with app control, programmable brew times, and auto-clean.',
        descriptionAr: 'صانعة قهوة بتقنية WiFi مع تحكم عبر التطبيق، أوقات تحضير قابلة للبرمجة، وتنظيف تلقائي.',
        price: 699.00,
        originalPrice: 899.00,
        currency: 'SAR',
        images: ['/products/coffee-maker-1.jpg'],
        thumbnail: '/products/coffee-maker-1.jpg',
        categoryId: categories[2].id,
        sallaProductId: 'prod_coffee_006',
        sallaUrl: 'https://homeessentials.salla.sa/product/smart-coffee-maker',
        merchantId: merchants[2].id,
        isActive: true,
        inStock: true,
        quantity: 42,
        trendingScore: 84.7,
        viewCount: 780,
        clickCount: 220,
        orderCount: 56,
        slug: 'smart-coffee-maker',
        tags: ['coffee', 'kitchen', 'smart', 'appliance'],
      },
    }),
    prisma.product.create({
      data: {
        title: 'Non-Stick Cookware Set',
        titleAr: 'طقم أواني طهي غير لاصقة',
        description: '12-piece premium non-stick cookware set, dishwasher safe, suitable for all cooktops.',
        descriptionAr: 'طقم أواني طهي فاخر مكون من 12 قطعة، غير لاصق، آمن لغسالة الصحون، مناسب لجميع المواقد.',
        price: 1299.00,
        currency: 'SAR',
        images: ['/products/cookware-1.jpg'],
        thumbnail: '/products/cookware-1.jpg',
        categoryId: categories[2].id,
        sallaProductId: 'prod_cookware_007',
        sallaUrl: 'https://homeessentials.salla.sa/product/cookware-set',
        merchantId: merchants[2].id,
        isActive: true,
        inStock: true,
        quantity: 25,
        trendingScore: 79.2,
        viewCount: 590,
        clickCount: 165,
        orderCount: 41,
        slug: 'non-stick-cookware-set',
        tags: ['cookware', 'kitchen', 'cooking', 'non-stick'],
      },
    }),

    // Beauty & Health - Beauty Corner
    prisma.product.create({
      data: {
        title: 'Vitamin C Serum Set',
        titleAr: 'مجموعة سيروم فيتامين سي',
        description: 'Professional skincare set with Vitamin C serum, hyaluronic acid, and niacinamide.',
        descriptionAr: 'مجموعة عناية بالبشرة احترافية تحتوي على سيروم فيتامين سي، حمض الهيالورونيك، والنياسيناميد.',
        price: 449.00,
        originalPrice: 599.00,
        currency: 'SAR',
        images: ['/products/serum-1.jpg'],
        thumbnail: '/products/serum-1.jpg',
        categoryId: categories[3].id,
        sallaProductId: 'prod_serum_008',
        sallaUrl: 'https://beautycorner.salla.sa/product/vitamin-c-serum',
        merchantId: merchants[3].id,
        isActive: true,
        inStock: true,
        quantity: 85,
        trendingScore: 90.6,
        viewCount: 1050,
        clickCount: 295,
        orderCount: 74,
        slug: 'vitamin-c-serum-set',
        tags: ['skincare', 'beauty', 'vitamin-c', 'serum'],
      },
    }),
    prisma.product.create({
      data: {
        title: 'Luxury Perfume Collection',
        titleAr: 'مجموعة عطور فاخرة',
        description: 'Set of 3 premium fragrances in elegant packaging, long-lasting scents.',
        descriptionAr: 'مجموعة من 3 عطور فاخرة في عبوات أنيقة، روائح طويلة الأمد.',
        price: 899.00,
        currency: 'SAR',
        images: ['/products/perfume-1.jpg'],
        thumbnail: '/products/perfume-1.jpg',
        categoryId: categories[3].id,
        sallaProductId: 'prod_perfume_009',
        sallaUrl: 'https://beautycorner.salla.sa/product/luxury-perfume',
        merchantId: merchants[3].id,
        isActive: true,
        inStock: true,
        quantity: 50,
        trendingScore: 86.3,
        viewCount: 890,
        clickCount: 240,
        orderCount: 62,
        slug: 'luxury-perfume-collection',
        tags: ['perfume', 'fragrance', 'luxury', 'beauty'],
      },
    }),

    // Sports & Outdoors - Sports Pro
    prisma.product.create({
      data: {
        title: 'Yoga Mat Premium',
        titleAr: 'سجادة يوغا فاخرة',
        description: 'Extra thick, non-slip yoga mat with carrying strap, eco-friendly material.',
        descriptionAr: 'سجادة يوغا سميكة للغاية، غير قابلة للانزلاق مع حزام حمل، مواد صديقة للبيئة.',
        price: 199.00,
        currency: 'SAR',
        images: ['/products/yoga-mat-1.jpg'],
        thumbnail: '/products/yoga-mat-1.jpg',
        categoryId: categories[4].id,
        sallaProductId: 'prod_yoga_010',
        sallaUrl: 'https://sportspro.salla.sa/product/yoga-mat',
        merchantId: merchants[4].id,
        isActive: true,
        inStock: true,
        quantity: 150,
        trendingScore: 73.9,
        viewCount: 480,
        clickCount: 135,
        orderCount: 34,
        slug: 'yoga-mat-premium',
        tags: ['yoga', 'fitness', 'exercise', 'wellness'],
      },
    }),
    prisma.product.create({
      data: {
        title: 'Adjustable Dumbbells Set',
        titleAr: 'طقم دمبلز قابل للتعديل',
        description: 'Space-saving adjustable dumbbells, 5-25kg per dumbbell, quick weight change system.',
        descriptionAr: 'دمبلز قابل للتعديل موفر للمساحة، 5-25 كجم لكل دمبل، نظام تغيير وزن سريع.',
        price: 1599.00,
        originalPrice: 1999.00,
        currency: 'SAR',
        images: ['/products/dumbbells-1.jpg'],
        thumbnail: '/products/dumbbells-1.jpg',
        categoryId: categories[4].id,
        sallaProductId: 'prod_dumbbells_011',
        sallaUrl: 'https://sportspro.salla.sa/product/dumbbells',
        merchantId: merchants[4].id,
        isActive: true,
        inStock: true,
        quantity: 32,
        trendingScore: 81.5,
        viewCount: 720,
        clickCount: 195,
        orderCount: 49,
        slug: 'adjustable-dumbbells-set',
        tags: ['dumbbells', 'fitness', 'strength', 'gym'],
      },
    }),

    // More trending products
    prisma.product.create({
      data: {
        title: 'Wireless Keyboard & Mouse Combo',
        titleAr: 'طقم لوحة مفاتيح وماوس لاسلكي',
        description: 'Ergonomic wireless keyboard and mouse set with silent keys and 2-year battery life.',
        descriptionAr: 'طقم لوحة مفاتيح وماوس لاسلكي مريح مع مفاتيح صامتة وبطارية تدوم سنتين.',
        price: 299.00,
        currency: 'SAR',
        images: ['/products/keyboard-1.jpg'],
        thumbnail: '/products/keyboard-1.jpg',
        categoryId: categories[0].id,
        sallaProductId: 'prod_keyboard_012',
        sallaUrl: 'https://techgalaxy.salla.sa/product/keyboard-mouse',
        merchantId: merchants[0].id,
        isActive: true,
        inStock: true,
        quantity: 95,
        trendingScore: 68.2,
        viewCount: 420,
        clickCount: 115,
        orderCount: 28,
        slug: 'wireless-keyboard-mouse-combo',
        tags: ['keyboard', 'mouse', 'wireless', 'computer'],
      },
    }),
    prisma.product.create({
      data: {
        title: 'Stainless Steel Water Bottle',
        titleAr: 'قارورة ماء من الفولاذ المقاوم للصدأ',
        description: 'Insulated water bottle keeps drinks cold for 24h, hot for 12h. BPA-free.',
        descriptionAr: 'قارورة ماء معزولة تحافظ على برودة المشروبات لمدة 24 ساعة، وسخونتها لمدة 12 ساعة. خالية من BPA.',
        price: 149.00,
        currency: 'SAR',
        images: ['/products/bottle-1.jpg'],
        thumbnail: '/products/bottle-1.jpg',
        categoryId: categories[4].id,
        sallaProductId: 'prod_bottle_013',
        sallaUrl: 'https://sportspro.salla.sa/product/water-bottle',
        merchantId: merchants[4].id,
        isActive: true,
        inStock: true,
        quantity: 200,
        trendingScore: 65.7,
        viewCount: 380,
        clickCount: 98,
        orderCount: 24,
        slug: 'stainless-steel-water-bottle',
        tags: ['bottle', 'hydration', 'sports', 'eco-friendly'],
      },
    }),
    prisma.product.create({
      data: {
        title: 'Minimalist Desk Organizer',
        titleAr: 'منظم مكتب بسيط',
        description: 'Bamboo desk organizer with multiple compartments for pens, phones, and accessories.',
        descriptionAr: 'منظم مكتب من الخيزران مع أقسام متعددة للأقلام والهواتف والإكسسوارات.',
        price: 179.00,
        currency: 'SAR',
        images: ['/products/organizer-1.jpg'],
        thumbnail: '/products/organizer-1.jpg',
        categoryId: categories[2].id,
        sallaProductId: 'prod_organizer_014',
        sallaUrl: 'https://homeessentials.salla.sa/product/desk-organizer',
        merchantId: merchants[2].id,
        isActive: true,
        inStock: true,
        quantity: 88,
        trendingScore: 62.4,
        viewCount: 310,
        clickCount: 82,
        orderCount: 19,
        slug: 'minimalist-desk-organizer',
        tags: ['organizer', 'desk', 'office', 'bamboo'],
      },
    }),
    prisma.product.create({
      data: {
        title: 'Scented Candle Gift Set',
        titleAr: 'طقم شموع معطرة هدية',
        description: 'Set of 6 premium scented candles in luxury packaging, perfect for gifting.',
        descriptionAr: 'مجموعة من 6 شموع معطرة فاخرة في عبوات راقية، مثالية للهدايا.',
        price: 249.00,
        currency: 'SAR',
        images: ['/products/candles-1.jpg'],
        thumbnail: '/products/candles-1.jpg',
        categoryId: categories[2].id,
        sallaProductId: 'prod_candles_015',
        sallaUrl: 'https://homeessentials.salla.sa/product/scented-candles',
        merchantId: merchants[2].id,
        isActive: true,
        inStock: true,
        quantity: 110,
        trendingScore: 70.1,
        viewCount: 450,
        clickCount: 125,
        orderCount: 31,
        slug: 'scented-candle-gift-set',
        tags: ['candles', 'home', 'fragrance', 'gift'],
      },
    }),
  ]);

  console.log(`✅ Created ${products.length} products`);

  // ============================================
  // USERS
  // ============================================
  console.log('👥 Creating users...');
  const users = await Promise.all([
    prisma.user.create({
      data: {
        name: 'Ahmed Al-Rashid',
        email: 'ahmed@example.com',
        password: '$2a$10$XQK8Z.VH5J5L9L9L9L9L9eXYZ123456789', // Hashed "password123"
        phone: '+966501111111',
        role: UserRole.CUSTOMER,
        language: 'ar',
        emailVerified: new Date(),
      },
    }),
    prisma.user.create({
      data: {
        name: 'Sarah Mohammed',
        email: 'sarah@example.com',
        password: '$2a$10$XQK8Z.VH5J5L9L9L9L9L9eXYZ123456789',
        phone: '+966502222222',
        role: UserRole.CUSTOMER,
        language: 'ar',
        emailVerified: new Date(),
      },
    }),
    prisma.user.create({
      data: {
        name: 'Admin User',
        email: 'admin@raff.sa',
        password: '$2a$10$XQK8Z.VH5J5L9L9L9L9L9eXYZ123456789',
        role: UserRole.ADMIN,
        language: 'ar',
        emailVerified: new Date(),
      },
    }),
  ]);

  console.log(`✅ Created ${users.length} users`);

  // ============================================
  // TRENDING LOGS
  // ============================================
  console.log('📊 Creating trending logs...');
  const trendingLogs = [];
  
  for (const product of products.slice(0, 8)) {
    // Simulate various engagement events
    for (let i = 0; i < Math.floor(Math.random() * 50) + 10; i++) {
      trendingLogs.push(
        prisma.trendingLog.create({
          data: {
            productId: product.id,
            eventType: ['VIEW', 'CLICK', 'ORDER', 'SAVE'][Math.floor(Math.random() * 4)] as any,
            weight: Math.random() * 10,
            createdAt: new Date(Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000), // Random time in last 7 days
          },
        })
      );
    }
  }

  await Promise.all(trendingLogs);
  console.log(`✅ Created ${trendingLogs.length} trending log entries`);

  console.log('');
  console.log('✨ Database seeded successfully!');
  console.log('');
  console.log('📊 Summary:');
  console.log(`   Categories: ${categories.length}`);
  console.log(`   Merchants: ${merchants.length}`);
  console.log(`   Products: ${products.length}`);
  console.log(`   Users: ${users.length}`);
  console.log(`   Trending Logs: ${trendingLogs.length}`);
  console.log('');
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error('❌ Error seeding database:', e);
    await prisma.$disconnect();
    process.exit(1);
  });

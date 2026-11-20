// Sample catalogue used by seed.js: 48 products (8 per category). Brand names are invented.
// Images are text placeholders from placehold.co; replace them from the admin panel.

const SIZES = {
  apparel: ['S', 'M', 'L', 'XL', 'XXL'],
  kids: ['2-3Y', '4-5Y', '6-7Y', '8-9Y'],
  shoes: ['6', '7', '8', '9', '10'],
  free: ['Free Size'],
  none: [],
};

// Background / text colours per category for placeholder images.
const PALETTE = {
  Women: ['fce7f3', 'a3165a'],
  Men: ['e0e7ff', '3730a3'],
  Kids: ['fef3c7', '92400e'],
  Home: ['dcfce7', '166534'],
  Beauty: ['f3e8ff', '6b21a8'],
  Electronics: ['e2e8f0', '1e293b'],
};

const DESCRIPTIONS = {
  Women: 'Comfortable everyday wear with a flattering fit. Breathable fabric, colour-fast dyes and neat finishing. Hand or gentle machine wash.',
  Men: 'Built for daily comfort with a modern fit. Soft, durable fabric that holds its shape wash after wash.',
  Kids: 'Soft, skin-friendly material made for play. Easy to wear, easy to wash, and designed to last through growth spurts.',
  Home: 'Adds warmth and colour to your space. Durable materials, easy to clean, and sized for Indian homes.',
  Beauty: 'Dermatologically tested and suitable for Indian skin types. Free from parabens. For external use only.',
  Electronics: 'Reliable everyday tech with a 6-month brand warranty. Includes a USB-C charging cable where applicable.',
};

// [title, brand, subCategory, price, mrp, sizes, tags]
const RAW = {
  Women: [
    ['Floral Printed Cotton Kurti', 'Saanjh', 'Kurtis', 349, 999, 'apparel', ['kurti', 'cotton', 'ethnic']],
    ['Banarasi Silk Blend Saree', 'Kesariya', 'Sarees', 799, 2499, 'free', ['saree', 'silk', 'wedding']],
    ['Anarkali Gown with Dupatta', 'Mehrang', 'Ethnic Sets', 1199, 3299, 'apparel', ['anarkali', 'gown', 'festive']],
    ['Rayon Palazzo Pants', 'Saanjh', 'Bottomwear', 299, 799, 'apparel', ['palazzo', 'rayon']],
    ['Georgette Party Wear Saree', 'Kesariya', 'Sarees', 649, 1899, 'free', ['saree', 'georgette', 'party']],
    ['Women Casual Western Top', 'Mehrang', 'Tops', 249, 699, 'apparel', ['top', 'western', 'casual']],
    ['Embroidered Kurta Set', 'Saanjh', 'Ethnic Sets', 899, 2199, 'apparel', ['kurta set', 'embroidered']],
    ['Women Flat Ethnic Juttis', 'Mehrang', 'Footwear', 399, 999, 'shoes', ['jutti', 'footwear', 'ethnic']],
  ],
  Men: [
    ['Men Slim Fit Casual Shirt', 'Urbanwala', 'Shirts', 449, 1299, 'apparel', ['shirt', 'casual', 'cotton']],
    ['Men Solid Round Neck T-Shirt', 'Northline', 'T-Shirts', 199, 599, 'apparel', ['t-shirt', 'tshirt', 'solid']],
    ['Men Stretchable Slim Jeans', 'Urbanwala', 'Jeans', 699, 1999, 'apparel', ['jeans', 'denim']],
    ['Men Cotton Kurta Pyjama Set', 'Northline', 'Ethnic', 799, 1999, 'apparel', ['kurta', 'pyjama', 'ethnic']],
    ['Men Running Sports Shoes', 'Urbanwala', 'Footwear', 899, 2499, 'shoes', ['shoes', 'sports', 'running']],
    ['Men Track Pants', 'Northline', 'Activewear', 349, 899, 'apparel', ['track pants', 'gym']],
    ['Men Printed Polo T-Shirt', 'Urbanwala', 'T-Shirts', 299, 799, 'apparel', ['polo', 't-shirt']],
    ['Men Hooded Sweatshirt', 'Northline', 'Winterwear', 599, 1499, 'apparel', ['hoodie', 'sweatshirt', 'winter']],
  ],
  Kids: [
    ['Girls Party Frock', 'Tinyloom', 'Girls Dresses', 449, 1199, 'kids', ['frock', 'dress', 'party']],
    ['Boys Cotton T-Shirt Pack of 3', 'Chhota Kadam', 'Boys T-Shirts', 399, 999, 'kids', ['t-shirt', 'combo']],
    ['Kids Ethnic Kurta Set', 'Tinyloom', 'Ethnic', 549, 1399, 'kids', ['kurta', 'ethnic', 'festive']],
    ['Baby Cotton Romper', 'Chhota Kadam', 'Infants', 249, 599, 'kids', ['romper', 'baby']],
    ['Kids Light-Up Sneakers', 'Chhota Kadam', 'Footwear', 499, 1299, 'kids', ['shoes', 'led', 'sneakers']],
    ['Girls Denim Dungaree', 'Tinyloom', 'Girls Dresses', 599, 1499, 'kids', ['dungaree', 'denim']],
    ['Kids Printed Night Suit', 'Chhota Kadam', 'Nightwear', 349, 899, 'kids', ['night suit', 'pyjama']],
    ['Wooden Learning Puzzle Set', 'Tinyloom', 'Toys', 299, 699, 'none', ['toy', 'puzzle', 'learning']],
  ],
  Home: [
    ['Cotton Double Bedsheet with 2 Pillow Covers', 'Gharonda', 'Bedsheets', 449, 1299, 'none', ['bedsheet', 'cotton']],
    ['Blackout Door Curtains Set of 2', 'Nestara', 'Curtains', 599, 1599, 'none', ['curtain', 'blackout']],
    ['Non-Stick Cookware Set 3 Pcs', 'Gharonda', 'Kitchen', 999, 2499, 'none', ['cookware', 'kitchen', 'non-stick']],
    ['Decorative Cushion Covers Set of 5', 'Nestara', 'Cushions', 299, 899, 'none', ['cushion', 'decor']],
    ['Anti-Skid Bath Mat', 'Gharonda', 'Bath', 199, 499, 'none', ['bath mat', 'bathroom']],
    ['Steel Water Bottle 1L', 'Nestara', 'Kitchen', 249, 599, 'none', ['bottle', 'steel']],
    ['LED Fairy String Lights 10m', 'Nestara', 'Decor', 199, 549, 'none', ['lights', 'diwali', 'decor']],
    ['Printed Ceramic Coffee Mugs Set of 2', 'Gharonda', 'Kitchen', 279, 699, 'none', ['mug', 'ceramic']],
  ],
  Beauty: [
    ['Matte Liquid Lipstick Combo', 'Glowveda', 'Makeup', 299, 799, 'none', ['lipstick', 'matte', 'makeup']],
    ['Vitamin C Face Serum 30ml', 'Kumkum Naturals', 'Skincare', 349, 899, 'none', ['serum', 'vitamin c', 'skincare']],
    ['Aloe Vera Gel 200ml', 'Kumkum Naturals', 'Skincare', 149, 349, 'none', ['aloe vera', 'gel']],
    ['Kajal and Eyeliner Combo', 'Glowveda', 'Makeup', 199, 499, 'none', ['kajal', 'eyeliner']],
    ['Onion Hair Oil 200ml', 'Kumkum Naturals', 'Haircare', 249, 599, 'none', ['hair oil', 'onion']],
    ['Sunscreen SPF 50 Gel 50g', 'Glowveda', 'Skincare', 299, 699, 'none', ['sunscreen', 'spf']],
    ['Nail Polish Set of 6', 'Glowveda', 'Nails', 199, 549, 'none', ['nail polish']],
    ['Herbal Face Wash 100ml', 'Kumkum Naturals', 'Skincare', 129, 299, 'none', ['face wash', 'herbal']],
  ],
  Electronics: [
    ['Wireless Bluetooth Earbuds', 'Soundpeak', 'Audio', 899, 2999, 'none', ['earbuds', 'bluetooth', 'tws']],
    ['Smart Fitness Watch', 'Voltix', 'Wearables', 1499, 4999, 'none', ['smartwatch', 'fitness']],
    ['10000mAh Power Bank', 'Voltix', 'Mobile Accessories', 699, 1799, 'none', ['power bank', 'charger']],
    ['Portable Bluetooth Speaker', 'Soundpeak', 'Audio', 799, 2199, 'none', ['speaker', 'bluetooth']],
    ['Wired Earphones with Mic', 'Soundpeak', 'Audio', 199, 599, 'none', ['earphones', 'wired']],
    ['Fast Charging USB-C Cable 1m', 'Voltix', 'Mobile Accessories', 149, 499, 'none', ['cable', 'usb-c']],
    ['Mobile Stand and Tripod', 'Voltix', 'Mobile Accessories', 349, 999, 'none', ['tripod', 'stand']],
    ['Neckband Bluetooth Headphones', 'Soundpeak', 'Audio', 599, 1599, 'none', ['neckband', 'bluetooth']],
  ],
};

const placeholder = (text, [bg, fg]) =>
  `https://placehold.co/600x800/${bg}/${fg}/png?text=${encodeURIComponent(text).replace(/%20/g, '+')}`;

// Small deterministic PRNG so every seed run produces the same ratings/stock.
function rng(seed) {
  let s = seed;
  return () => {
    s = (s * 9301 + 49297) % 233280;
    return s / 233280;
  };
}

// Colour options offered per category (Beauty products have none).
const COLOR_POOL = {
  Women: ['Pink', 'Maroon', 'Mustard', 'Teal', 'Navy Blue', 'Black', 'Lavender', 'Green'],
  Men: ['Black', 'White', 'Navy Blue', 'Olive', 'Grey', 'Maroon', 'Sky Blue'],
  Kids: ['Red', 'Yellow', 'Blue', 'Pink', 'Green', 'Orange'],
  Home: ['Multicolor', 'Beige', 'Blue', 'Green', 'Grey'],
  Beauty: [],
  Electronics: ['Black', 'White', 'Blue', 'Grey'],
};

function pickColors(category, rand) {
  const pool = [...COLOR_POOL[category]];
  const n = Math.min(pool.length, category === 'Electronics' || category === 'Home' ? 2 : 3);
  const out = [];
  while (out.length < n) out.push(pool.splice(Math.floor(rand() * pool.length), 1)[0]);
  return out;
}

function buildProducts() {
  const rand = rng(42);
  const products = [];
  for (const [category, rows] of Object.entries(RAW)) {
    for (const [title, brand, subCategory, price, mrp, sizeKey, tags] of rows) {
      const colours = PALETTE[category];
      const rating = Math.round((3.4 + rand() * 1.5) * 10) / 10;
      const numReviews = Math.floor(50 + rand() * 4950);
      products.push({
        title,
        brand,
        category,
        subCategory,
        price,
        mrp,
        sizes: SIZES[sizeKey],
        colors: pickColors(category, rand),
        tags,
        description: `${title} by ${brand}. ${DESCRIPTIONS[category]}`,
        images: [title, `${subCategory} - View 2`, `${brand} - Detail`].map((t) => ({ url: placeholder(t, colours) })),
        // Seeded ratings act as a baseline; real reviews are blended in on top.
        rating,
        numReviews,
        baseRating: rating,
        baseReviews: numReviews,
        stock: Math.floor(15 + rand() * 185),
      });
    }
  }
  return products;
}

module.exports = { buildProducts };

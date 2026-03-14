// Waste Types
export type WasteType = 'Organic' | 'Plastic' | 'Metal' | 'Paper' | 'E-waste' | 'Textile';

export type ListingStatus = 'Available' | 'Pending' | 'Sold';

export interface WasteListing {
  id: string;
  wasteType: WasteType;
  title: string;
  quantity: number;
  unit: string;
  pricePerKg: number;
  totalPrice: number;
  msmeName: string;
  msmeId: string;
  isVerified: boolean;
  location: string;
  description: string;
  status: ListingStatus;
  postedAt: Date;
  image?: string;
  sellerRating: number;
  sellerDeals: number;
  sellerPhone: string;
}

export interface Recycler {
  id: string;
  name: string;
  type: string;
  rating: number;
  dealsCompleted: number;
  isVerified: boolean;
  phone: string;
  location: string;
  avatar: string;
  specialization: WasteType[];
}

export interface Transaction {
  id: string;
  listingId: string;
  wasteType: WasteType;
  quantity: number;
  amount: number;
  msmeName: string;
  recyclerName: string;
  recyclerId: string;
  date: Date;
  status: 'Completed' | 'Processing' | 'Cancelled';
}

export interface GreenScoreData {
  totalScore: number;
  maxScore: number;
  badge: 'Bronze' | 'Silver' | 'Gold' | 'Platinum';
  breakdown: {
    recyclingRate: { current: number; max: number };
    transactionActivity: { current: number; max: number };
    wasteVariety: { current: number; max: number };
    buyerRatings: { current: number; max: number };
  };
  recommendations: {
    id: string;
    title: string;
    description: string;
    icon: string;
    status: 'Complete' | 'In Progress' | 'Pending';
    points: number;
  }[];
}

export interface LeaderboardEntry {
  rank: number;
  msmeName: string;
  msmeId: string;
  score: number;
  badge: 'Bronze' | 'Silver' | 'Gold' | 'Platinum';
  trend: 'up' | 'down' | 'stable';
  avatar: string;
  isCurrentUser: boolean;
}

// Tamil Nadu locations
const locations = [
  'Chennai', 'Coimbatore', 'Madurai', 'Tiruchirappalli', 'Salem',
  'Tirunelveli', 'Vellore', 'Erode', 'Tiruppur', 'Dindigul',
  'Thanjavur', 'Ranipet', 'Sivakasi', 'Karur', 'Udhagamandalam',
  'Hosur', 'Nagercoil', 'Kanchipuram', 'Kumbakonam', 'Pollachi'
];

// Realistic MSME names
const msmeNames = [
  'ABC Food Processing Pvt Ltd', 'Kumar Textiles', 'Lakshmi Industries',
  'Sri Balaji Packaging', 'Chennai Steel Works', 'Coimbatore Garments',
  'Madurai Paper Mills', 'Tamil Tech Electronics', 'Erode Cotton Mills',
  'Tirupur Knits', 'Salem Foundry Works', 'Vellore Leather Goods',
  'Dindigul Lock Manufacturing', 'Karur Home Textiles', 'Sivakasi Fireworks',
  'Hosur Auto Components', 'Thanjavur Agro Products', 'Ranipet Tanneries',
  'Pollachi Coconut Products', 'Kanchipuram Silks', 'Trichy Metals',
  'Kumbakonam Sweets & Foods', 'Nagercoil Coir Industries', 'Tirunelveli Halwa House',
  'Chennai Plastics Ltd', 'Coimbatore Pumps & Motors', 'Madurai Tiles & Ceramics',
  'Salem Sago Industries', 'Erode Turmeric Processing', 'Tirupur Dyeing & Bleaching'
];

// Recycler company names
const recyclerNames = [
  'EcoGreen Recyclers', 'Bharat Waste Solutions', 'Tamil Nadu Composters',
  'Green Earth Metals', 'Papermix Recyclers', 'E-Cycle India',
  'Textile Revival Co', 'Chennai Scrap Dealers', 'CleanTech Recyclers',
  'Organic Waste Masters', 'Metro Plastic Recyclers', 'Steel Scrap India',
  'Paper Tigers Recycling', 'E-Waste Warriors', 'Fabric Forward',
  'Bio Decomposers Inc', 'Coimbatore Green Hub', 'Southern Recyclers',
  'Eco Warriors TN', 'Zero Waste Solutions', 'Circular Economy Pvt Ltd',
  'Waste to Wealth Co', 'Green Chain Recyclers', 'Sustainable Solutions TN',
  'ReNew Materials'
];

const recyclerTypes = [
  'Organic Composter', 'Plastic Recycler', 'Metal Scrap Dealer',
  'Paper & Cardboard Recycler', 'E-Waste Processor', 'Textile Recycler'
];

// Generate random date within range
const randomDate = (daysAgo: number): Date => {
  const date = new Date();
  date.setDate(date.getDate() - Math.floor(Math.random() * daysAgo));
  date.setHours(Math.floor(Math.random() * 24), Math.floor(Math.random() * 60));
  return date;
};

// Generate random ID
const generateId = (): string => Math.random().toString(36).substring(2, 9);

// Price ranges by waste type (₹ per kg)
const priceRanges: Record<WasteType, { min: number; max: number }> = {
  'Organic': { min: 2, max: 8 },
  'Plastic': { min: 8, max: 18 },
  'Metal': { min: 15, max: 35 },
  'Paper': { min: 5, max: 12 },
  'E-waste': { min: 20, max: 50 },
  'Textile': { min: 10, max: 25 }
};

// Waste type descriptions
const wasteDescriptions: Record<WasteType, string[]> = {
  'Organic': [
    'Food processing waste suitable for composting',
    'Agricultural residue from crop processing',
    'Vegetable and fruit market waste',
    'Restaurant kitchen waste, sorted'
  ],
  'Plastic': [
    'HDPE containers and drums',
    'PET bottles, cleaned and sorted',
    'PP packaging material',
    'Mixed plastic scrap from manufacturing'
  ],
  'Metal': [
    'Iron and steel scrap from fabrication',
    'Aluminum cuttings and shavings',
    'Copper wire and cable scrap',
    'Mixed ferrous metal waste'
  ],
  'Paper': [
    'Corrugated cardboard boxes',
    'Office paper and documents',
    'Newspaper and magazine bundles',
    'Kraft paper packaging waste'
  ],
  'E-waste': [
    'Obsolete computer equipment',
    'Electronic circuit boards',
    'Old mobile phones and tablets',
    'Industrial electronic components'
  ],
  'Textile': [
    'Cotton fabric cutting waste',
    'Polyester garment rejects',
    'Mixed textile manufacturing waste',
    'Denim and heavy fabric scraps'
  ]
};

// Generate waste listings
export const generateWasteListings = (): WasteListing[] => {
  const wasteTypes: WasteType[] = ['Organic', 'Plastic', 'Metal', 'Paper', 'E-waste', 'Textile'];
  const listings: WasteListing[] = [];
  
  for (let i = 0; i < 35; i++) {
    const wasteType = wasteTypes[Math.floor(Math.random() * wasteTypes.length)];
    const quantity = Math.floor(Math.random() * 1900) + 100;
    const priceRange = priceRanges[wasteType];
    const pricePerKg = Math.floor(Math.random() * (priceRange.max - priceRange.min)) + priceRange.min;
    const descriptions = wasteDescriptions[wasteType];
    
    // Status distribution: 70% Available, 20% Pending, 10% Sold
    const statusRandom = Math.random();
    const status: ListingStatus = statusRandom < 0.7 ? 'Available' : statusRandom < 0.9 ? 'Pending' : 'Sold';
    
    listings.push({
      id: generateId(),
      wasteType,
      title: `${wasteType} Waste - ${quantity}kg`,
      quantity,
      unit: 'kg',
      pricePerKg,
      totalPrice: quantity * pricePerKg,
      msmeName: msmeNames[Math.floor(Math.random() * msmeNames.length)],
      msmeId: generateId(),
      isVerified: Math.random() > 0.3,
      location: locations[Math.floor(Math.random() * locations.length)],
      description: descriptions[Math.floor(Math.random() * descriptions.length)],
      status,
      postedAt: randomDate(30),
      sellerRating: Math.round((Math.random() * 1.5 + 3.5) * 10) / 10,
      sellerDeals: Math.floor(Math.random() * 200) + 5,
      sellerPhone: `+91 ${Math.floor(Math.random() * 9000000000) + 1000000000}`
    });
  }
  
  return listings.sort((a, b) => b.postedAt.getTime() - a.postedAt.getTime());
};

// Generate recyclers
export const generateRecyclers = (): Recycler[] => {
  const wasteTypes: WasteType[] = ['Organic', 'Plastic', 'Metal', 'Paper', 'E-waste', 'Textile'];
  const recyclers: Recycler[] = [];
  
  for (let i = 0; i < 25; i++) {
    const specialization: WasteType[] = [];
    const numSpecs = Math.floor(Math.random() * 3) + 1;
    for (let j = 0; j < numSpecs; j++) {
      const type = wasteTypes[Math.floor(Math.random() * wasteTypes.length)];
      if (!specialization.includes(type)) specialization.push(type);
    }
    
    recyclers.push({
      id: generateId(),
      name: recyclerNames[i] || `Recycler ${i + 1}`,
      type: recyclerTypes[Math.floor(Math.random() * recyclerTypes.length)],
      rating: Math.round((Math.random() * 1.5 + 3.5) * 10) / 10,
      dealsCompleted: Math.floor(Math.random() * 480) + 20,
      isVerified: Math.random() > 0.25,
      phone: `+91 ${Math.floor(Math.random() * 9000000000) + 1000000000}`,
      location: locations[Math.floor(Math.random() * locations.length)],
      avatar: `https://api.dicebear.com/7.x/initials/svg?seed=${recyclerNames[i] || 'R' + i}`,
      specialization
    });
  }
  
  return recyclers.sort((a, b) => b.rating - a.rating);
};

// Generate transactions
export const generateTransactions = (): Transaction[] => {
  const wasteTypes: WasteType[] = ['Organic', 'Plastic', 'Metal', 'Paper', 'E-waste', 'Textile'];
  const transactions: Transaction[] = [];
  const recyclers = generateRecyclers();
  
  for (let i = 0; i < 50; i++) {
    const wasteType = wasteTypes[Math.floor(Math.random() * wasteTypes.length)];
    const quantity = Math.floor(Math.random() * 800) + 50;
    const priceRange = priceRanges[wasteType];
    const pricePerKg = Math.floor(Math.random() * (priceRange.max - priceRange.min)) + priceRange.min;
    const recycler = recyclers[Math.floor(Math.random() * recyclers.length)];
    
    const statusRandom = Math.random();
    const status = statusRandom < 0.85 ? 'Completed' : statusRandom < 0.95 ? 'Processing' : 'Cancelled';
    
    transactions.push({
      id: generateId(),
      listingId: generateId(),
      wasteType,
      quantity,
      amount: quantity * pricePerKg,
      msmeName: msmeNames[Math.floor(Math.random() * msmeNames.length)],
      recyclerName: recycler.name,
      recyclerId: recycler.id,
      date: randomDate(90),
      status: status as 'Completed' | 'Processing' | 'Cancelled'
    });
  }
  
  return transactions.sort((a, b) => b.date.getTime() - a.date.getTime());
};

// Generate green score data
export const generateGreenScoreData = (): GreenScoreData => {
  const recyclingScore = Math.floor(Math.random() * 15) + 25;
  const activityScore = Math.floor(Math.random() * 10) + 18;
  const varietyScore = Math.floor(Math.random() * 8) + 7;
  const ratingsScore = Math.floor(Math.random() * 6) + 8;
  const totalScore = recyclingScore + activityScore + varietyScore + ratingsScore;
  
  let badge: 'Bronze' | 'Silver' | 'Gold' | 'Platinum';
  if (totalScore >= 85) badge = 'Platinum';
  else if (totalScore >= 70) badge = 'Gold';
  else if (totalScore >= 50) badge = 'Silver';
  else badge = 'Bronze';
  
  return {
    totalScore,
    maxScore: 100,
    badge,
    breakdown: {
      recyclingRate: { current: recyclingScore, max: 40 },
      transactionActivity: { current: activityScore, max: 30 },
      wasteVariety: { current: varietyScore, max: 15 },
      buyerRatings: { current: ratingsScore, max: 15 }
    },
    recommendations: [
      {
        id: '1',
        title: 'Increase Waste Diversity',
        description: 'List at least 4 different waste types to maximize your variety score',
        icon: 'Boxes',
        status: 'In Progress',
        points: 5
      },
      {
        id: '2',
        title: 'Complete 10 Transactions',
        description: 'Reach 10 completed transactions this month for bonus points',
        icon: 'TrendingUp',
        status: 'In Progress',
        points: 8
      },
      {
        id: '3',
        title: 'Get Verified Status',
        description: 'Complete business verification to unlock premium features',
        icon: 'BadgeCheck',
        status: totalScore > 70 ? 'Complete' : 'Pending',
        points: 10
      },
      {
        id: '4',
        title: 'Maintain High Ratings',
        description: 'Keep your buyer satisfaction above 4.5 stars',
        icon: 'Star',
        status: 'Complete',
        points: 5
      }
    ]
  };
};

// Generate leaderboard
export const generateLeaderboard = (): LeaderboardEntry[] => {
  const entries: LeaderboardEntry[] = [];
  
  for (let i = 0; i < 10; i++) {
    const score = Math.floor(Math.random() * 30) + (95 - i * 5);
    let badge: 'Bronze' | 'Silver' | 'Gold' | 'Platinum';
    if (score >= 85) badge = 'Platinum';
    else if (score >= 70) badge = 'Gold';
    else if (score >= 50) badge = 'Silver';
    else badge = 'Bronze';
    
    const trendRandom = Math.random();
    const trend = trendRandom < 0.4 ? 'up' : trendRandom < 0.7 ? 'stable' : 'down';
    
    entries.push({
      rank: i + 1,
      msmeName: msmeNames[i],
      msmeId: generateId(),
      score,
      badge,
      trend: trend as 'up' | 'down' | 'stable',
      avatar: `https://api.dicebear.com/7.x/initials/svg?seed=${msmeNames[i]}`,
      isCurrentUser: i === 4
    });
  }
  
  return entries.sort((a, b) => b.score - a.score).map((e, i) => ({ ...e, rank: i + 1 }));
};

// Chart data generators
export const generateRevenueData = (months: number = 6) => {
  const data = [];
  const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const currentMonth = new Date().getMonth();
  
  for (let i = months - 1; i >= 0; i--) {
    const monthIndex = (currentMonth - i + 12) % 12;
    data.push({
      month: monthNames[monthIndex],
      revenue: Math.floor(Math.random() * 150000) + 50000,
      transactions: Math.floor(Math.random() * 30) + 10
    });
  }
  
  return data;
};

export const generateWasteCompositionData = () => {
  const wasteTypes: WasteType[] = ['Organic', 'Plastic', 'Metal', 'Paper', 'E-waste', 'Textile'];
  const colors = ['#059669', '#3b82f6', '#6b7280', '#f59e0b', '#8b5cf6', '#ec4899'];
  
  return wasteTypes.map((type, index) => ({
    name: type,
    value: Math.floor(Math.random() * 2000) + 500,
    color: colors[index]
  }));
};

export const generateMonthlyWasteData = () => {
  const wasteTypes: WasteType[] = ['Organic', 'Plastic', 'Metal', 'Paper', 'E-waste', 'Textile'];
  
  return wasteTypes.map(type => ({
    name: type,
    quantity: Math.floor(Math.random() * 3000) + 500
  }));
};

// Utility functions for formatting
export const formatCurrency = (amount: number): string => {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0
  }).format(amount);
};

export const formatNumber = (num: number): string => {
  return new Intl.NumberFormat('en-IN').format(num);
};

export const formatRelativeTime = (date: Date | string): string => {
  const d = typeof date === 'string' ? new Date(date) : date;
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);
  
  if (diffMins < 60) return `${diffMins} min ago`;
  if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
  if (diffDays < 7) return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
  return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
};

// Initial data exports
export const wasteListings = generateWasteListings();
export const recyclers = generateRecyclers();
export const transactions = generateTransactions();
export const greenScoreData = generateGreenScoreData();
export const leaderboard = generateLeaderboard();
export const revenueData = generateRevenueData();
export const wasteCompositionData = generateWasteCompositionData();
export const monthlyWasteData = generateMonthlyWasteData();

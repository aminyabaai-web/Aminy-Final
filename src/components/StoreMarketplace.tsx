/**
 * StoreMarketplace - Curated Resources & Tools Store
 *
 * Features:
 * - Curated resources for parents (books, tools, toys)
 * - Partner product recommendations
 * - Digital downloads (guides, templates, checklists)
 * - Affiliate integration ready
 * - Category filtering and search
 * - Favorites/wishlist functionality
 */

import React, { useState, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Search,
  Filter,
  Heart,
  ShoppingCart,
  ExternalLink,
  Star,
  BookOpen,
  Puzzle,
  Headphones,
  FileText,
  Video,
  Package,
  Tag,
  ChevronDown,
  X,
  Check,
  Download,
  Crown,
  Sparkles,
  ArrowLeft,
} from 'lucide-react';
import { Button } from './ui/button';
import { Card } from './ui/card';
import { Badge } from './ui/badge';
import { Input } from './ui/input';
import { toast } from 'sonner';
import { TierType } from '../lib/tier-utils';

// Types
interface Product {
  id: string;
  name: string;
  description: string;
  category: ProductCategory;
  price: number | 'free' | 'included';
  originalPrice?: number;
  image: string;
  rating: number;
  reviewCount: number;
  tags: string[];
  affiliateUrl?: string;
  downloadUrl?: string;
  isDigital: boolean;
  isPremium: boolean;
  isNew: boolean;
  isFeatured: boolean;
  bcbaRecommended: boolean;
}

type ProductCategory =
  | 'books'
  | 'toys'
  | 'tools'
  | 'digital-guides'
  | 'templates'
  | 'courses'
  | 'sensory'
  | 'visual-aids';

interface StoreMarketplaceProps {
  userTier?: TierType;
  onBack?: () => void;
  onNavigate?: (screen: string) => void;
}

// Category definitions
const CATEGORIES: { id: ProductCategory; name: string; icon: React.ReactNode }[] = [
  { id: 'books', name: 'Books', icon: <BookOpen className="w-4 h-4" /> },
  { id: 'toys', name: 'Toys & Games', icon: <Puzzle className="w-4 h-4" /> },
  { id: 'sensory', name: 'Sensory Tools', icon: <Headphones className="w-4 h-4" /> },
  { id: 'digital-guides', name: 'Digital Guides', icon: <FileText className="w-4 h-4" /> },
  { id: 'templates', name: 'Templates', icon: <Download className="w-4 h-4" /> },
  { id: 'courses', name: 'Courses', icon: <Video className="w-4 h-4" /> },
  { id: 'visual-aids', name: 'Visual Aids', icon: <Package className="w-4 h-4" /> },
  { id: 'tools', name: 'Parent Tools', icon: <Tag className="w-4 h-4" /> },
];

// Mock products data
const PRODUCTS: Product[] = [
  {
    id: '1',
    name: 'The Explosive Child',
    description: 'A new approach for understanding and parenting easily frustrated, chronically inflexible children by Dr. Ross Greene.',
    category: 'books',
    price: 16.99,
    originalPrice: 18.99,
    image: '/images/products/explosive-child.jpg',
    rating: 4.8,
    reviewCount: 2340,
    tags: ['behavior', 'parenting', 'bestseller'],
    affiliateUrl: 'https://amazon.com/dp/B000SEH47C',
    isDigital: false,
    isPremium: false,
    isNew: false,
    isFeatured: true,
    bcbaRecommended: true,
  },
  {
    id: '2',
    name: 'Visual Schedule Cards (Printable)',
    description: '50+ visual schedule cards for daily routines. Includes morning, bedtime, school, and therapy activities.',
    category: 'visual-aids',
    price: 'included',
    image: '/images/products/visual-cards.jpg',
    rating: 4.9,
    reviewCount: 156,
    tags: ['visual-supports', 'routine', 'printable'],
    downloadUrl: '/downloads/visual-schedule-cards.pdf',
    isDigital: true,
    isPremium: false,
    isNew: true,
    isFeatured: true,
    bcbaRecommended: true,
  },
  {
    id: '3',
    name: 'Calm Down Kit',
    description: 'Curated sensory kit with fidget toys, weighted lap pad, noise-canceling headphones, and calm-down cards.',
    category: 'sensory',
    price: 49.99,
    originalPrice: 65.99,
    image: '/images/products/calm-kit.jpg',
    rating: 4.7,
    reviewCount: 892,
    tags: ['sensory', 'calming', 'kit'],
    affiliateUrl: 'https://amazon.com/dp/B09XYZ123',
    isDigital: false,
    isPremium: false,
    isNew: false,
    isFeatured: true,
    bcbaRecommended: true,
  },
  {
    id: '4',
    name: 'Behavior Tracking Template Bundle',
    description: 'Complete bundle of behavior tracking sheets, ABC data forms, and progress monitoring templates.',
    category: 'templates',
    price: 'free',
    image: '/images/products/behavior-templates.jpg',
    rating: 4.6,
    reviewCount: 234,
    tags: ['tracking', 'data', 'templates'],
    downloadUrl: '/downloads/behavior-tracking-bundle.zip',
    isDigital: true,
    isPremium: false,
    isNew: false,
    isFeatured: false,
    bcbaRecommended: true,
  },
  {
    id: '5',
    name: 'ABA Fundamentals for Parents',
    description: 'Self-paced video course covering ABA basics, reinforcement strategies, and behavior management.',
    category: 'courses',
    price: 'included',
    image: '/images/products/aba-course.jpg',
    rating: 4.9,
    reviewCount: 1203,
    tags: ['ABA', 'course', 'video'],
    downloadUrl: '/courses/aba-fundamentals',
    isDigital: true,
    isPremium: true,
    isNew: false,
    isFeatured: true,
    bcbaRecommended: true,
  },
  {
    id: '6',
    name: 'Time Timer MOD',
    description: 'Visual timer that shows the passage of time. Perfect for transitions, tasks, and building time awareness.',
    category: 'tools',
    price: 36.95,
    image: '/images/products/time-timer.jpg',
    rating: 4.8,
    reviewCount: 5678,
    tags: ['timer', 'visual', 'transitions'],
    affiliateUrl: 'https://amazon.com/dp/B000J5OFW0',
    isDigital: false,
    isPremium: false,
    isNew: false,
    isFeatured: false,
    bcbaRecommended: true,
  },
  {
    id: '7',
    name: 'Social Stories Collection',
    description: '25 customizable social stories covering common scenarios: going to the doctor, making friends, handling changes.',
    category: 'digital-guides',
    price: 'included',
    image: '/images/products/social-stories.jpg',
    rating: 4.7,
    reviewCount: 445,
    tags: ['social-stories', 'customizable', 'scenarios'],
    downloadUrl: '/downloads/social-stories-collection.pdf',
    isDigital: true,
    isPremium: true,
    isNew: true,
    isFeatured: false,
    bcbaRecommended: true,
  },
  {
    id: '8',
    name: 'Marble Maze Fidget Board',
    description: 'Wooden marble maze for focus and calm. Great for waiting rooms, car rides, and quiet time.',
    category: 'toys',
    price: 24.99,
    image: '/images/products/marble-maze.jpg',
    rating: 4.5,
    reviewCount: 312,
    tags: ['fidget', 'focus', 'toy'],
    affiliateUrl: 'https://amazon.com/dp/B08XYZ789',
    isDigital: false,
    isPremium: false,
    isNew: true,
    isFeatured: false,
    bcbaRecommended: false,
  },
  {
    id: '9',
    name: 'IEP Meeting Preparation Guide',
    description: 'Comprehensive guide to preparing for IEP meetings. Includes checklists, question templates, and rights overview.',
    category: 'digital-guides',
    price: 'free',
    image: '/images/products/iep-guide.jpg',
    rating: 4.9,
    reviewCount: 678,
    tags: ['IEP', 'advocacy', 'school'],
    downloadUrl: '/downloads/iep-preparation-guide.pdf',
    isDigital: true,
    isPremium: false,
    isNew: false,
    isFeatured: true,
    bcbaRecommended: true,
  },
  {
    id: '10',
    name: 'Emotion Flashcards (Printable)',
    description: '40 emotion flashcards with real photos. Helps children identify and label feelings.',
    category: 'visual-aids',
    price: 'included',
    image: '/images/products/emotion-cards.jpg',
    rating: 4.8,
    reviewCount: 234,
    tags: ['emotions', 'feelings', 'flashcards'],
    downloadUrl: '/downloads/emotion-flashcards.pdf',
    isDigital: true,
    isPremium: false,
    isNew: false,
    isFeatured: false,
    bcbaRecommended: true,
  },
];

export function StoreMarketplace({
  userTier = 'free',
  onBack,
  onNavigate,
}: StoreMarketplaceProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<ProductCategory | 'all'>('all');
  const [showFilters, setShowFilters] = useState(false);
  const [favorites, setFavorites] = useState<Set<string>>(new Set());
  const [filters, setFilters] = useState({
    freeOnly: false,
    bcbaRecommended: false,
    digitalOnly: false,
    newOnly: false,
  });

  // Check if user has premium access
  const hasPremiumAccess = useMemo(() =>
    ['core', 'pro', 'proplus'].includes(userTier),
  [userTier]);

  // Filter products
  const filteredProducts = useMemo(() => {
    return PRODUCTS.filter((product) => {
      // Search filter
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        const matchesSearch =
          product.name.toLowerCase().includes(query) ||
          product.description.toLowerCase().includes(query) ||
          product.tags.some(tag => tag.toLowerCase().includes(query));
        if (!matchesSearch) return false;
      }

      // Category filter
      if (selectedCategory !== 'all' && product.category !== selectedCategory) {
        return false;
      }

      // Additional filters
      if (filters.freeOnly && product.price !== 'free' && product.price !== 'included') {
        return false;
      }
      if (filters.bcbaRecommended && !product.bcbaRecommended) {
        return false;
      }
      if (filters.digitalOnly && !product.isDigital) {
        return false;
      }
      if (filters.newOnly && !product.isNew) {
        return false;
      }

      return true;
    });
  }, [searchQuery, selectedCategory, filters]);

  // Featured products
  const featuredProducts = useMemo(() =>
    PRODUCTS.filter(p => p.isFeatured).slice(0, 4),
  []);

  // Toggle favorite
  const toggleFavorite = useCallback((productId: string) => {
    setFavorites(prev => {
      const next = new Set(prev);
      if (next.has(productId)) {
        next.delete(productId);
        toast.success('Removed from favorites');
      } else {
        next.add(productId);
        toast.success('Added to favorites');
      }
      return next;
    });
  }, []);

  // Handle product action
  const handleProductAction = useCallback((product: Product) => {
    if (product.isPremium && !hasPremiumAccess) {
      toast.error('Upgrade to access this resource');
      onNavigate?.('paywall');
      return;
    }

    if (product.downloadUrl) {
      toast.success(`Downloading ${product.name}...`);
      // In real app, trigger download
      window.open(product.downloadUrl, '_blank');
    } else if (product.affiliateUrl) {
      window.open(product.affiliateUrl, '_blank');
    }
  }, [hasPremiumAccess, onNavigate]);

  // Render price
  const renderPrice = (product: Product) => {
    if (product.price === 'free') {
      return <Badge className="bg-green-100 text-green-700">Free</Badge>;
    }
    if (product.price === 'included') {
      return (
        <Badge className="bg-teal-100 text-teal-700">
          <Crown className="w-3 h-3 mr-1" />
          Included
        </Badge>
      );
    }
    return (
      <div className="flex items-center gap-2">
        <span className="font-bold text-slate-900">${product.price}</span>
        {product.originalPrice && (
          <span className="text-sm text-slate-400 line-through">${product.originalPrice}</span>
        )}
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900">
      {/* Header */}
      <div className="bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 sticky top-0 z-40">
        <div className="max-w-6xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              {onBack && (
                <Button variant="ghost" size="sm" onClick={onBack}>
                  <ArrowLeft className="w-4 h-4" />
                </Button>
              )}
              <div>
                <h1 className="text-xl font-bold text-slate-900 dark:text-white">Resource Store</h1>
                <p className="text-sm text-slate-500">BCBA-curated tools and resources</p>
              </div>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowFilters(!showFilters)}
              className="flex items-center gap-2"
            >
              <Filter className="w-4 h-4" />
              Filters
              {Object.values(filters).some(Boolean) && (
                <Badge className="bg-teal-500 text-white text-xs px-1.5">
                  {Object.values(filters).filter(Boolean).length}
                </Badge>
              )}
            </Button>
          </div>

          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <Input
              type="text"
              placeholder="Search resources..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>

          {/* Category Pills */}
          <div className="flex gap-2 mt-4 overflow-x-auto pb-2 scrollbar-hide">
            <Button
              variant={selectedCategory === 'all' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setSelectedCategory('all')}
              className="shrink-0"
            >
              All
            </Button>
            {CATEGORIES.map((category) => (
              <Button
                key={category.id}
                variant={selectedCategory === category.id ? 'default' : 'outline'}
                size="sm"
                onClick={() => setSelectedCategory(category.id)}
                className="shrink-0 flex items-center gap-1.5"
              >
                {category.icon}
                {category.name}
              </Button>
            ))}
          </div>
        </div>

        {/* Filters Panel */}
        <AnimatePresence>
          {showFilters && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="border-t border-slate-200 dark:border-slate-700 overflow-hidden"
            >
              <div className="max-w-6xl mx-auto px-4 py-4">
                <div className="flex flex-wrap gap-4">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={filters.freeOnly}
                      onChange={(e) => setFilters(prev => ({ ...prev, freeOnly: e.target.checked }))}
                      className="rounded border-slate-300"
                    />
                    <span className="text-sm">Free only</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={filters.bcbaRecommended}
                      onChange={(e) => setFilters(prev => ({ ...prev, bcbaRecommended: e.target.checked }))}
                      className="rounded border-slate-300"
                    />
                    <span className="text-sm">BCBA Recommended</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={filters.digitalOnly}
                      onChange={(e) => setFilters(prev => ({ ...prev, digitalOnly: e.target.checked }))}
                      className="rounded border-slate-300"
                    />
                    <span className="text-sm">Digital only</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={filters.newOnly}
                      onChange={(e) => setFilters(prev => ({ ...prev, newOnly: e.target.checked }))}
                      className="rounded border-slate-300"
                    />
                    <span className="text-sm">New arrivals</span>
                  </label>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Main Content */}
      <div className="max-w-6xl mx-auto px-4 py-6">
        {/* Featured Section (only on "all" category) */}
        {selectedCategory === 'all' && !searchQuery && (
          <div className="mb-8">
            <h2 className="text-lg font-semibold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-amber-500" />
              Featured Resources
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {featuredProducts.map((product) => (
                <Card
                  key={product.id}
                  className="overflow-hidden hover:shadow-lg transition-shadow cursor-pointer"
                  onClick={() => handleProductAction(product)}
                >
                  <div className="aspect-video bg-slate-100 dark:bg-slate-700 relative">
                    <div className="absolute inset-0 flex items-center justify-center text-slate-400">
                      {CATEGORIES.find(c => c.id === product.category)?.icon}
                    </div>
                    {product.isNew && (
                      <Badge className="absolute top-2 left-2 bg-blue-500 text-white">New</Badge>
                    )}
                    {product.bcbaRecommended && (
                      <Badge className="absolute top-2 right-2 bg-violet-500 text-white">
                        <Check className="w-3 h-3 mr-1" />
                        BCBA Pick
                      </Badge>
                    )}
                  </div>
                  <div className="p-4">
                    <h3 className="font-medium text-slate-900 dark:text-white line-clamp-1">
                      {product.name}
                    </h3>
                    <div className="flex items-center gap-1 mt-1">
                      <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
                      <span className="text-xs text-slate-500">{product.rating}</span>
                      <span className="text-xs text-slate-400">({product.reviewCount})</span>
                    </div>
                    <div className="mt-2">{renderPrice(product)}</div>
                  </div>
                </Card>
              ))}
            </div>
          </div>
        )}

        {/* Product Grid */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-slate-900 dark:text-white">
              {selectedCategory === 'all' ? 'All Resources' : CATEGORIES.find(c => c.id === selectedCategory)?.name}
            </h2>
            <span className="text-sm text-slate-500">
              {filteredProducts.length} {filteredProducts.length === 1 ? 'item' : 'items'}
            </span>
          </div>

          {filteredProducts.length === 0 ? (
            <Card className="p-12 text-center">
              <Package className="w-12 h-12 text-slate-300 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-slate-900 dark:text-white mb-2">
                No resources found
              </h3>
              <p className="text-slate-500 mb-4">
                Try adjusting your filters or search terms.
              </p>
              <Button
                variant="outline"
                onClick={() => {
                  setSearchQuery('');
                  setSelectedCategory('all');
                  setFilters({ freeOnly: false, bcbaRecommended: false, digitalOnly: false, newOnly: false });
                }}
              >
                Clear all filters
              </Button>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredProducts.map((product) => (
                <Card
                  key={product.id}
                  className="overflow-hidden hover:shadow-lg transition-shadow"
                >
                  <div className="aspect-video bg-slate-100 dark:bg-slate-700 relative">
                    <div className="absolute inset-0 flex items-center justify-center text-slate-400">
                      {CATEGORIES.find(c => c.id === product.category)?.icon}
                    </div>
                    {product.isNew && (
                      <Badge className="absolute top-2 left-2 bg-blue-500 text-white">New</Badge>
                    )}
                    {product.isPremium && !hasPremiumAccess && (
                      <div className="absolute inset-0 bg-slate-900/60 flex items-center justify-center">
                        <Badge className="bg-amber-500 text-white">
                          <Crown className="w-3 h-3 mr-1" />
                          Premium
                        </Badge>
                      </div>
                    )}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleFavorite(product.id);
                      }}
                      className="absolute top-2 right-2 p-2 bg-white/90 rounded-full hover:bg-white transition-colors"
                    >
                      <Heart
                        className={`w-4 h-4 ${
                          favorites.has(product.id)
                            ? 'fill-red-500 text-red-500'
                            : 'text-slate-400'
                        }`}
                      />
                    </button>
                  </div>
                  <div className="p-4">
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <h3 className="font-medium text-slate-900 dark:text-white line-clamp-2">
                        {product.name}
                      </h3>
                      {product.bcbaRecommended && (
                        <Badge className="shrink-0 bg-violet-100 text-violet-700 text-xs">
                          BCBA
                        </Badge>
                      )}
                    </div>
                    <p className="text-sm text-slate-500 line-clamp-2 mb-3">
                      {product.description}
                    </p>
                    <div className="flex items-center gap-1 mb-3">
                      <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
                      <span className="text-xs text-slate-500">{product.rating}</span>
                      <span className="text-xs text-slate-400">({product.reviewCount} reviews)</span>
                    </div>
                    <div className="flex items-center justify-between">
                      {renderPrice(product)}
                      <Button
                        size="sm"
                        onClick={() => handleProductAction(product)}
                        className="flex items-center gap-1"
                      >
                        {product.isDigital ? (
                          <>
                            <Download className="w-4 h-4" />
                            Get
                          </>
                        ) : (
                          <>
                            <ExternalLink className="w-4 h-4" />
                            View
                          </>
                        )}
                      </Button>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default StoreMarketplace;

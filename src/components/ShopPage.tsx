// Copyright (c) 2024-2026 Aminy LLC. All Rights Reserved.
// CONFIDENTIAL AND PROPRIETARY — Trade Secret of Aminy LLC
// Unauthorized use, reproduction, or distribution is strictly prohibited.
// See LICENSE file for details.

import React, { useState, useEffect } from 'react';
import { Button } from './ui/button';
import { Card } from './ui/card';
import { Badge } from './ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { Input } from './ui/input';
import { toast } from 'sonner';
import { 
  ArrowLeft,
  ShoppingBag,
  Star,
  Heart,
  Save,
  Share,
  Filter,
  Search,
  ExternalLink,
  Download,
  Play,
  Plus,
  Bell,
  User,
  ChevronRight,
  Package,
  Truck,
  MapPin,
  Zap,
  Brain,
  Target,
  Clock,
  DollarSign,
  Award,
  Shield,
  AlertTriangle,
  Eye,
  BookOpen,
  Video,
  FileText,
  Sparkles,
  CheckCircle,
  ShoppingCart,
  Calendar,
  TrendingUp,
  Users,
  Lightbulb,
  Gift,
  Headphones,
  School,
  Home,
  Palette,
  Volume2,
  X,
  ThumbsUp,
  Copy,
  Minus,
  CreditCard,
  Lock,
  Check
} from 'lucide-react';

interface ShopPageProps {
  onNavigate?: (destination: string) => void;
  userTier?: string;
}

interface CartItem {
  id: string;
  title: string;
  price: number;
  originalPrice?: number;
  quantity: number;
  image: string;
  type: 'product' | 'bundle';
  items?: string[];
}

interface PaymentMethod {
  id: string;
  type: 'card' | 'paypal' | 'apple';
  name: string;
  details: string;
  icon: React.ReactNode;
}

interface ShopProduct {
  id: number;
  title: string;
  description: string;
  price: number;
  originalPrice?: number;
  retailer: string;
  shipSpeed: string;
  rating: number;
  reviews: number;
  image: string;
  whyThisProduct: string;
  tags: string[];
  safetyCallouts: string[];
  tryFirst: string;
  category: string;
  inStock: boolean;
  affiliateLink: boolean;
  evidenceLevel: string;
  targets: string;
  useDuring: string[];
  contraindications: string | null;
  aminyApproved: boolean;
  postPurchaseSteps: string[];
  items?: string[];
}

interface PlanableItem {
  title: string;
  price?: number;
  category?: string;
  targets?: string;
}

interface CartableItem {
  id: number | string;
  title: string;
  price: number;
  originalPrice?: number;
  image: string;
  items?: string[];
}

interface ProductCardProps {
  product: ShopProduct;
  onSave: (id: number) => void;
  onAddToPlan: (product: ShopProduct) => void;
  onAddToJunior: (product: ShopProduct) => void;
  isSaved: boolean;
}

// Mock data for demonstration
const mockChildData = {
  name: "Eddie",
  age: 7,
  goals: ["speech development", "morning routines", "sensory regulation"],
  activeRoutines: ["morning routine", "bedtime routine"],
  sensitivities: ["loud sounds", "rough textures"],
  preferences: ["visual supports", "timers"],
  recentJuniorActivity: ["speech games", "social stories"]
};

export function ShopPage({ onNavigate, userTier = 'starter' }: ShopPageProps) {
  const [activeView, setActiveView] = useState('home');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [showFilters, setShowFilters] = useState(false);
  const [savedItems, setSavedItems] = useState<number[]>([]);
  const [selectedFilters, setSelectedFilters] = useState({
    priceRange: 'all',
    ageRange: 'all',
    context: 'all',
    inStock: false,
    fastShip: false,
    sustainability: false
  });

  // Cart state
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [showCartBadge, setShowCartBadge] = useState(false);
  const [checkoutStep, setCheckoutStep] = useState<'cart' | 'shipping' | 'payment' | 'confirmation'>('cart');
  const [orderConfirmed, setOrderConfirmed] = useState(false);
  const [shippingInfo, setShippingInfo] = useState({
    firstName: '',
    lastName: '',
    email: '',
    address: '',
    city: '',
    state: '',
    zipCode: '',
    phone: ''
  });
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<string>('card-1');

  // Smart bundles auto-built from user data
  const smartBundles = [
    {
      id: 'morning-calm',
      title: 'Morning Calm Starter',
      subtitle: `Handpicked for ${mockChildData.name}`,
      rationale: 'Based on: morning routine goals, sensory needs',
      price: 89.97,
      originalPrice: 109.95,
      items: ['Visual Schedule Cards', 'Time Timer', 'Noise-Reducing Headphones'],
      image: '🌅',
      savings: 19.98,
      bundleLogic: 'Includes everything to start: visual schedule, fidget, timer'
    },
    {
      id: 'speech-booster',
      title: 'Speech Booster Kit', 
      subtitle: 'Complete communication toolkit',
      rationale: 'Based on: speech goals, Ease activity',
      price: 64.99,
      originalPrice: 79.96,
      items: ['Mirror Cards', 'Articulation Cards', 'Straw Set', 'Mouth Tools'],
      image: '🗣️',
      savings: 14.97,
      bundleLogic: 'Includes everything to start: visual feedback, practice cards, oral motor tools'
    },
    {
      id: 'transitions-go',
      title: 'Transitions On-the-Go',
      subtitle: 'Portable support tools',
      rationale: 'Based on: routine challenges, sensory log',
      price: 39.99,
      originalPrice: 49.97,
      items: ['First/Then Cards', 'Fidget Toolkit', 'Chewy Necklace'],
      image: '🎒',
      savings: 9.98,
      bundleLogic: 'Includes everything to start: visual support, calming tools, oral input'
    }
  ];

  // Product categories
  const categories = [
    { id: 'all', name: 'All Products', count: 156, icon: <ShoppingBag className="w-4 h-4" /> },
    { id: 'sensory', name: 'Sensory Regulation', count: 43, icon: <Brain className="w-4 h-4" />, featured: true },
    { id: 'speech', name: 'Speech & Language', count: 38, icon: <Volume2 className="w-4 h-4" />, featured: true },
    { id: 'visual', name: 'Visual Supports', count: 29, icon: <Eye className="w-4 h-4" /> },
    { id: 'communication', name: 'Communication/AAC', count: 24, icon: <Users className="w-4 h-4" /> },
    { id: 'play', name: 'Play & Social', count: 35, icon: <Sparkles className="w-4 h-4" /> },
    { id: 'daily', name: 'Daily Living', count: 31, icon: <Home className="w-4 h-4" /> },
    { id: 'rewards', name: 'Rewards & Token Boards', count: 18, icon: <Award className="w-4 h-4" /> },
    { id: 'routines', name: 'Routines Tools', count: 22, icon: <Clock className="w-4 h-4" /> },
    { id: 'safety', name: 'Safety & Wearables', count: 15, icon: <Shield className="w-4 h-4" /> },
    { id: 'books', name: 'Books for Caregivers/Teachers', count: 27, icon: <BookOpen className="w-4 h-4" /> },
    { id: 'digital', name: 'Apps & Printables', count: 34, icon: <FileText className="w-4 h-4" /> }
  ];

  // Personalized product recommendations
  const personalizedProducts = [
    {
      id: 1,
      title: 'Visual Timer Pro',
      description: 'Countdown timer with color-coded progression',
      price: 29.99,
      originalPrice: 34.99,
      retailer: 'Amazon',
      shipSpeed: 'Prime 2-day • Free returns',
      rating: 4.8,
      reviews: 342,
      image: '⏰',
      whyThisProduct: `Helps ${mockChildData.name} with morning routine transitions (based on goals & logs)`,
      tags: ['Evidence-aligned', 'School-friendly', 'Under $50'],
      safetyCallouts: ['Ages 3+', 'No small parts', 'Supervision recommended'],
      tryFirst: 'Printable timer template available',
      category: 'routines',
      inStock: true,
      affiliateLink: true,
      evidenceLevel: 'Backed by classroom trials; timers reduce transition latency by ~20–40% in K-2',
      targets: 'Transitions → first/then understanding',
      useDuring: ['Morning routine', 'Homework time', 'Bedtime prep'],
      contraindications: null,
      aminyApproved: true,
      postPurchaseSteps: [
        'Set up 5-minute practice session',
        'Download visual schedule template',
        'Complete Ease mini-mission: Timer Challenge'
      ]
    },
    {
      id: 2,
      title: 'Laminated Choice Board Set',
      description: 'Customizable visual choice cards',
      price: 19.99,
      retailer: 'Target',
      shipSpeed: '2-day delivery • Free returns',
      rating: 4.9,
      reviews: 156,
      image: '🖼️',
      whyThisProduct: 'Improves requesting skills during activities (based on goals & logs)',
      tags: ['Teacher-favorite', 'Customizable', 'Aminy-approved'],
      safetyCallouts: ['Latex-free', 'Ages 2+', 'Classroom-safe'],
      tryFirst: 'Download sample choice cards',
      category: 'visual',
      inStock: true,
      affiliateLink: true,
      evidenceLevel: 'AAC research shows choice boards increase functional communication by 60-80%',
      targets: 'Functional communication → requesting',
      useDuring: ['Snack time', 'Play activities', 'Car rides'],
      contraindications: null,
      aminyApproved: true,
      postPurchaseSteps: [
        'Laminate and cut choice cards',
        'Practice pointing with child',
        'Use in Ease activity: Choice Game'
      ]
    },
    {
      id: 3,
      title: 'Sensory Calm Down Kit',
      description: 'Portable sensory regulation tools',
      price: 45.99,
      originalPrice: 52.99,
      retailer: 'Therapy Shoppe',
      shipSpeed: 'Standard shipping • 30-day returns',
      rating: 4.7,
      reviews: 89,
      image: '🧘',
      whyThisProduct: 'Supports sensory regulation during transitions (based on goals & logs)',
      tags: ['Clinically referenced', 'Portable', 'Aminy-approved'],
      safetyCallouts: ['Ages 4+', 'Choking hazard - small parts', 'Adult supervision required'],
      tryFirst: 'Mini breathing exercise in Ease',
      category: 'sensory',
      inStock: true,
      affiliateLink: true,
      evidenceLevel: 'OT studies show portable sensory kits reduce meltdown duration by 35% average',
      targets: 'Self-regulation → calming strategies',
      useDuring: ['School transitions', 'Public outings', 'Bedtime wind-down'],
      contraindications: 'May be over-stimulating for high sensory seekers',
      aminyApproved: true,
      postPurchaseSteps: [
        'Practice one calming technique together',
        'Create portable "calm kit" bag',
        'Unlock Ease breathing mission: Ocean Waves'
      ]
    },
    {
      id: 4,
      title: 'Social Stories Digital Library',
      description: 'Customizable social stories collection',
      price: 12.99,
      retailer: 'Aminy Store',
      shipSpeed: 'Instant download',
      rating: 4.6,
      reviews: 234,
      image: '📚',
      whyThisProduct: 'Teaches social skills for school success (based on goals & logs)',
      tags: ['Digital', 'Customizable', 'Under $20', 'Aminy-approved'],
      safetyCallouts: ['Digital content', 'Screen time considerations'],
      tryFirst: 'Sample social story in Ease',
      category: 'digital',
      inStock: true,
      affiliateLink: false,
      isDigital: true,
      evidenceLevel: 'Social stories show 70-90% improvement in targeted social behaviors across studies',
      targets: 'Social skills → peer interactions',
      useDuring: ['Before social events', 'School preparation', 'New situations'],
      contraindications: null,
      aminyApproved: true,
      postPurchaseSteps: [
        'Customize with child\'s photo',
        'Read together 3 times',
        'Create Ease social mission: Friend Helper'
      ]
    }
  ];

  // Quick wins under $25
  const quickWins = [
    { id: 11, title: 'First/Then Cards', price: 8.99, image: '📋' },
    { id: 12, title: 'Fidget Stress Ball', price: 6.99, image: '⚽' },
    { id: 13, title: 'Visual Schedule Strips', price: 12.99, image: '📊' },
    { id: 14, title: 'Chewy Necklace', price: 15.99, image: '🔗' },
    { id: 15, title: 'Emotion Cards Set', price: 18.99, image: '😊' }
  ];

  // Expert picks
  const expertPicks = [
    {
      id: 21,
      title: 'Understanding Sensory Processing',
      type: 'Article',
      duration: '8-min read',
      icon: <BookOpen className="w-4 h-4" />,
      level: 'Beginner',
      whyItWorks: 'Foundational knowledge for sensory support',
      whenToUse: 'When starting sensory interventions',
      tryToday: 'Observe sensory preferences for 10 minutes'
    },
    {
      id: 22,
      title: 'Building Morning Routines',
      type: 'Video',
      duration: '12-min watch',
      icon: <Play className="w-4 h-4" />,
      level: 'Practical',
      whyItWorks: 'Step-by-step routine implementation',
      whenToUse: 'Before starting new routines',
      tryToday: 'Create one visual schedule'
    },
    {
      id: 23,
      title: 'Communication Strategies',
      type: 'Printable',
      duration: '15-min download',
      icon: <Download className="w-4 h-4" />,
      level: 'Deep-dive',
      whyItWorks: 'Daily scripts for common situations',
      whenToUse: 'During communication challenges',
      tryToday: 'Practice one script with child'
    }
  ];

  const handleSaveItem = (productId: number) => {
    setSavedItems(prev => 
      prev.includes(productId) 
        ? prev.filter(id => id !== productId)
        : [...prev, productId]
    );
  };

  const handleAddToPlan = (product: PlanableItem) => {
    // Simulate adding to Plan system
    const planItem = {
      id: `plan-item-${Date.now()}`,
      title: product.title,
      type: 'shop-recommendation',
      price: product.price,
      category: product.category || 'general',
      recommendedFor: mockChildData.name,
      addedAt: new Date().toISOString(),
      status: 'suggested'
    };
    
    // Here you would normally send to backend/state management
    
    // Show user feedback
    toast.success(`Added "${product.title}" to ${mockChildData.name}'s Plan! View in Plan tab to implement.`);
    
    // Navigate to Plan if callback provided
    if (onNavigate) {
      setTimeout(() => {
        onNavigate('plan');
      }, 1500);
    }
  };

  const handleAddToJunior = (product: PlanableItem) => {
    // Simulate adding to Junior system
    const juniorActivity = {
      id: `junior-activity-${Date.now()}`,
      title: `Practice with ${product.title}`,
      description: `Interactive activity using ${product.title}`,
      childName: mockChildData.name,
      estimatedTime: '10-15 minutes',
      skillTargets: product.targets || 'General development',
      addedAt: new Date().toISOString(),
      status: 'available'
    };
    
    // Here you would normally send to backend/state management
    
    // Show user feedback
    toast.success(`Created Ease activity for "${product.title}". Check the Ease tab for new activities.`);
    
    // Navigate to Junior if callback provided
    if (onNavigate) {
      setTimeout(() => {
        onNavigate('junior');
      }, 1500);
    }
  };

  // Cart functions
  const addToCart = (item: CartableItem, type: 'product' | 'bundle' = 'product') => {
    const cartItem: CartItem = {
      id: type === 'bundle' ? `bundle-${item.id}` : `product-${item.id}`,
      title: item.title,
      price: item.price,
      originalPrice: item.originalPrice,
      quantity: 1,
      image: item.image,
      type,
      items: type === 'bundle' ? item.items : undefined
    };

    setCartItems(prev => {
      const existingItem = prev.find(cartItem => cartItem.id === cartItem.id);
      if (existingItem) {
        return prev.map(cartItem => 
          cartItem.id === cartItem.id 
            ? { ...cartItem, quantity: cartItem.quantity + 1 }
            : cartItem
        );
      }
      return [...prev, cartItem];
    });

    setShowCartBadge(true);
    setTimeout(() => setShowCartBadge(false), 3000);
  };

  const updateCartQuantity = (id: string, newQuantity: number) => {
    if (newQuantity === 0) {
      setCartItems(prev => prev.filter(item => item.id !== id));
    } else {
      setCartItems(prev => prev.map(item => 
        item.id === id ? { ...item, quantity: newQuantity } : item
      ));
    }
  };

  const getCartTotal = () => {
    return cartItems.reduce((total, item) => total + (item.price * item.quantity), 0);
  };

  const getCartItemCount = () => {
    return cartItems.reduce((total, item) => total + item.quantity, 0);
  };

  const clearCart = () => {
    setCartItems([]);
  };

  const handleCheckout = () => {
    if (cartItems.length === 0) return;
    setActiveView('cart');
    setCheckoutStep('cart');
  };

  const proceedToShipping = () => {
    setCheckoutStep('shipping');
  };

  const proceedToPayment = () => {
    setCheckoutStep('payment');
  };

  const completeOrder = () => {
    setCheckoutStep('confirmation');
    setOrderConfirmed(true);
    // Clear cart after successful order
    setTimeout(() => {
      clearCart();
      setActiveView('home');
      setCheckoutStep('cart');
      setOrderConfirmed(false);
    }, 5000);
  };

  const paymentMethods: PaymentMethod[] = [
    {
      id: 'card-1',
      type: 'card',
      name: 'Credit Card',
      details: 'Visa, Mastercard, American Express',
      icon: <CreditCard className="w-5 h-5" />
    },
    {
      id: 'paypal',
      type: 'paypal',
      name: 'PayPal',
      details: 'Pay with your PayPal account',
      icon: <Package className="w-5 h-5" />
    },
    {
      id: 'apple-pay',
      type: 'apple',
      name: 'Apple Pay',
      details: 'Touch ID or Face ID',
      icon: <Sparkles className="w-5 h-5" />
    }
  ];

  const renderPersonalizedHome = () => (
    <div className="space-y-8">
      {/* Hero Section */}
      <div className="text-center space-y-3 sm:space-y-4">
        <h1 className="text-2xl font-semibold text-slate-900">Handpicked for {mockChildData.name}</h1>
        <div className="inline-flex items-center gap-2 px-3 py-1 bg-accent/10 rounded-full">
          <Brain className="w-4 h-4 text-accent" />
          <span className="text-sm font-medium text-accent">Based on: speech goals, morning routine, sensory log</span>
        </div>
      </div>

      {/* Smart Bundles */}
      <div className="space-y-3 sm:space-y-4">
        <h2 className="text-lg sm:text-xl font-semibold text-slate-900">Smart Bundles</h2>
        <div className="grid gap-3 sm:gap-4 sm:gap-6 md:grid-cols-2 lg:grid-cols-3">
          {smartBundles.map((bundle) => (
            <Card key={bundle.id} className="p-6 hover:shadow-lg transition-shadow">
              <div className="flex items-start justify-between mb-4">
                <div className="text-3xl">{bundle.image}</div>
                <Badge className="bg-green-100 text-green-700 text-xs">
                  Save ${bundle.savings} vs. separate items
                </Badge>
              </div>
              <h3 className="font-semibold text-slate-900 mb-1">{bundle.title}</h3>
              <p className="text-sm text-slate-600 mb-2">{bundle.subtitle}</p>
              <p className="text-xs text-accent mb-2">{bundle.rationale}</p>
              <p className="text-xs text-slate-500 mb-3">{bundle.bundleLogic}</p>
              
              <div className="space-y-2 mb-4">
                {bundle.items.map((item, idx) => (
                  <div key={idx} className="flex items-center gap-2 text-sm text-slate-600">
                    <CheckCircle className="w-3 h-3 text-green-600 flex-shrink-0" />
                    <span>{item}</span>
                  </div>
                ))}
              </div>
              
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <span className="text-lg font-semibold text-slate-900">${bundle.price}</span>
                  <span className="text-sm text-slate-500 line-through">${bundle.originalPrice}</span>
                </div>
              </div>
              
              <div className="space-y-2">
                <Button 
                  className="w-full bg-accent hover:bg-accent/90 text-white"
                  onClick={() => addToCart(bundle, 'bundle')}
                >
                  <ShoppingCart className="w-4 h-4 mr-2" />
                  Add Bundle to Cart
                </Button>
                <div className="flex gap-2">
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="flex-1"
                    onClick={() => toast.info('Bundle preview feature coming soon!')}
                  >
                    <Eye className="w-4 h-4 mr-1" />
                    Preview
                  </Button>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="flex-1"
                    onClick={() => handleAddToPlan(bundle)}
                  >
                    <Plus className="w-4 h-4 mr-1" />
                    Add to Plan
                  </Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      </div>

      {/* Personalized Recommendations */}
      <div className="space-y-3 sm:space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg sm:text-xl font-semibold text-slate-900">Recommended for You</h2>
          <Button variant="ghost" size="sm" onClick={() => setActiveView('categories')}>
            View All <ChevronRight className="w-4 h-4 ml-1" />
          </Button>
        </div>
        <div className="grid gap-3 sm:gap-4 sm:gap-6 md:grid-cols-2 lg:grid-cols-3">
          {personalizedProducts.slice(0, 3).map((product) => (
            <ProductCard
              key={product.id}
              product={product}
              onSave={handleSaveItem}
              onAddToPlan={handleAddToPlan}
              onAddToJunior={handleAddToJunior}
              isSaved={savedItems.includes(product.id)}
            />
          ))}
        </div>
      </div>

      {/* Quick Wins Under $25 */}
      <div className="space-y-3 sm:space-y-4">
        <h2 className="text-lg sm:text-xl font-semibold text-slate-900">Quick Wins Under $25</h2>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3 sm:gap-4">
          {quickWins.map((item) => (
            <Card key={item.id} className="p-4 text-center hover:shadow-md transition-shadow">
              <div className="text-2xl mb-2">{item.image}</div>
              <h3 className="text-sm font-medium text-slate-900 mb-1">{item.title}</h3>
              <p className="text-sm font-semibold text-accent">${item.price}</p>
              <Button 
                size="sm" 
                className="w-full mt-2 bg-accent hover:bg-accent/90 text-white"
                onClick={() => addToCart(item, 'product')}
              >
                Add
              </Button>
            </Card>
          ))}
        </div>
      </div>

      {/* Try Printable First */}
      <div className="space-y-3 sm:space-y-4">
        <h2 className="text-lg sm:text-xl font-semibold text-slate-900">Try Printable First</h2>
        <div className="grid gap-3 sm:gap-4 md:grid-cols-3">
          {expertPicks.map((pick) => (
            <Card key={pick.id} className="p-4 hover:shadow-md transition-shadow">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-8 h-8 bg-accent/10 rounded-lg flex items-center justify-center text-accent">
                  {pick.icon}
                </div>
                <div>
                  <h3 className="font-medium text-slate-900">{pick.title}</h3>
                  <div className="flex items-center gap-2 text-xs text-slate-500">
                    <Badge variant="outline" className="text-xs">{pick.type}</Badge>
                    <span>{pick.duration}</span>
                  </div>
                </div>
              </div>
              <div className="space-y-2 text-sm text-slate-600">
                <div><strong>Why it works:</strong> {pick.whyItWorks}</div>
                <div><strong>When to use:</strong> {pick.whenToUse}</div>
                <div><strong>Try today:</strong> {pick.tryToday}</div>
              </div>
              <div className="flex gap-2 mt-4">
                <Button size="sm" className="flex-1">
                  {pick.type === 'Video' ? 'Watch' : pick.type === 'Printable' ? 'Download' : 'Read'}
                </Button>
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="flex-1"
                  onClick={() => handleAddToPlan(pick)}
                >
                  Add to Plan
                </Button>
              </div>
            </Card>
          ))}
        </div>
      </div>

      {/* Personalization Knobs - NEW */}
      <div className="flex flex-wrap gap-3 justify-center mb-4 sm:mb-6">
        <Button variant="outline" size="sm" className="border-accent text-accent hover:bg-accent/10">
          <Brain className="w-4 h-4 mr-2" />
          Narrow to: Sensory Calming
        </Button>
        <Button variant="outline" size="sm">
          <Volume2 className="w-4 h-4 mr-2" />
          Communication
        </Button>
        <Button variant="outline" size="sm">
          <DollarSign className="w-4 h-4 mr-2" />
          Under $25
        </Button>
        {mockChildData.sensitivities.includes('loud sounds') && (
          <Button variant="outline" size="sm" className="border-green-200 text-green-700 hover:bg-green-50">
            <Headphones className="w-4 h-4 mr-2" />
            Quiet-friendly
          </Button>
        )}
      </div>

      {/* Quick Action Chips */}
      <div className="flex flex-wrap gap-3 justify-center">
        <Button variant="outline" onClick={() => setActiveView('categories')}>
          <Brain className="w-4 h-4 mr-2" />
          Browse by Need
        </Button>
        <Button variant="outline" onClick={() => setActiveView('search')}>
          <School className="w-4 h-4 mr-2" />
          Teacher Packet Items
        </Button>
        {userTier === 'pro' && (
          <Button variant="outline" className="border-accent text-accent hover:bg-accent/5">
            <Zap className="w-4 h-4 mr-2" />
            Message Coach
          </Button>
        )}
      </div>
    </div>
  );

  const renderCategories = () => (
    <div className="space-y-3 sm:space-y-4 sm:space-y-6">
      <h1 className="text-2xl font-semibold text-slate-900">Browse Categories</h1>
      
      <div className="grid gap-3 sm:gap-4 md:grid-cols-2 lg:grid-cols-3">
        {categories.filter(cat => cat.id !== 'all').map((category) => (
          <Card key={category.id} className="p-6 hover:shadow-lg transition-shadow cursor-pointer">
            <div className="flex items-center gap-3 sm:gap-4 mb-4">
              <div className="w-12 h-12 bg-accent/10 rounded-xl flex items-center justify-center text-accent">
                {category.icon}
              </div>
              <div>
                <h3 className="font-semibold text-slate-900">{category.name}</h3>
                <p className="text-sm text-slate-500">{category.count} products</p>
              </div>
            </div>
            
            {category.featured && (
              <div className="space-y-2">
                <Badge className="bg-accent/10 text-accent text-xs mb-2">AI Featured</Badge>
                <div className="space-y-1 text-sm text-slate-600">
                  <div className="flex items-center gap-2">
                    <Award className="w-3 h-3 text-amber-500" />
                    <span>Best value options</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Users className="w-3 h-3 text-blue-500" />
                    <span>Teacher favorites</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <BookOpen className="w-3 h-3 text-green-500" />
                    <span>Clinically referenced</span>
                  </div>
                </div>
              </div>
            )}
            
            <Button className="w-full mt-4" variant="outline">
              Explore {category.name}
              <ChevronRight className="w-4 h-4 ml-2" />
            </Button>
          </Card>
        ))}
      </div>
    </div>
  );

  const renderSearch = () => (
    <div className="space-y-3 sm:space-y-4 sm:space-y-6">
      <h1 className="text-2xl font-semibold text-slate-900">Search & Filter</h1>
      
      {/* Search Bar */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-slate-400" />
        <Input
          placeholder="Search by goal or skill (e.g., 'reduce elopement', 'increase requesting')"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-10 text-base"
        />
      </div>

      {/* Filter Toggles */}
      <div className="flex flex-wrap gap-2">
        <Button
          variant={showFilters ? "default" : "outline"}
          size="sm"
          onClick={() => setShowFilters(!showFilters)}
        >
          <Filter className="w-4 h-4 mr-2" />
          Filters
        </Button>
        <Button variant="outline" size="sm">
          <DollarSign className="w-4 h-4 mr-2" />
          Budget
        </Button>
        <Button variant="outline" size="sm">
          <Truck className="w-4 h-4 mr-2" />
          Fast Ship
        </Button>
        <Button variant="outline" size="sm">
          <School className="w-4 h-4 mr-2" />
          School Safe
        </Button>
      </div>

      {/* Filter Panel */}
      {showFilters && (
        <Card className="p-6 space-y-3 sm:space-y-4">
          <h3 className="font-semibold text-slate-900">Filters</h3>
          <div className="grid gap-3 sm:gap-4 md:grid-cols-3">
            <div>
              <label className="text-sm font-medium text-slate-700 block mb-2">Age Range</label>
              <select className="w-full border rounded-lg px-3 py-2">
                <option value="all">All Ages</option>
                <option value="2-4">2-4 years</option>
                <option value="5-7">5-7 years</option>
                <option value="8-12">8-12 years</option>
                <option value="teen">Teen</option>
              </select>
            </div>
            <div>
              <label className="text-sm font-medium text-slate-700 block mb-2">Budget</label>
              <select className="w-full border rounded-lg px-3 py-2">
                <option value="all">Any Price</option>
                <option value="under-25">Under $25</option>
                <option value="25-50">$25 - $50</option>
                <option value="50-100">$50 - $100</option>
                <option value="over-100">Over $100</option>
              </select>
            </div>
            <div>
              <label className="text-sm font-medium text-slate-700 block mb-2">Context</label>
              <select className="w-full border rounded-lg px-3 py-2">
                <option value="all">All Contexts</option>
                <option value="home">Home</option>
                <option value="school">School</option>
                <option value="community">Community</option>
                <option value="travel">Travel</option>
              </select>
            </div>
          </div>
          
          <div className="space-y-3">
            <label className="flex items-center gap-2">
              <input type="checkbox" className="rounded border-gray-300" />
              <span className="text-sm">In stock only</span>
            </label>
            <label className="flex items-center gap-2">
              <input type="checkbox" className="rounded border-gray-300" />
              <span className="text-sm">Fast shipping available</span>
            </label>
            <label className="flex items-center gap-2">
              <input type="checkbox" className="rounded border-gray-300" />
              <span className="text-sm">Sustainable/eco-friendly</span>
            </label>
          </div>
        </Card>
      )}

      {/* Search Results */}
      <div className="grid gap-3 sm:gap-4 sm:gap-6 md:grid-cols-2 lg:grid-cols-3">
        {personalizedProducts.map((product) => (
          <ProductCard
            key={product.id}
            product={product}
            onSave={handleSaveItem}
            onAddToPlan={handleAddToPlan}
            onAddToJunior={handleAddToJunior}
            isSaved={savedItems.includes(product.id)}
          />
        ))}
      </div>
    </div>
  );

  const renderLearn = () => (
    <div className="space-y-3 sm:space-y-4 sm:space-y-6">
      <h1 className="text-2xl font-semibold text-slate-900">Learn & Resources</h1>
      
      <div className="grid gap-3 sm:gap-4 sm:gap-6 md:grid-cols-2 lg:grid-cols-3">
        {expertPicks.map((pick) => (
          <Card key={pick.id} className="p-6 hover:shadow-md transition-shadow">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 bg-accent/10 rounded-xl flex items-center justify-center text-accent">
                {pick.icon}
              </div>
              <div>
                <h3 className="font-semibold text-slate-900">{pick.title}</h3>
                <div className="flex items-center gap-2 text-xs text-slate-500">
                  <Badge variant="outline" className="text-xs">{pick.type}</Badge>
                  <span>{pick.duration}</span>
                  <Badge variant="outline" className="text-xs">{pick.level}</Badge>
                </div>
              </div>
            </div>
            <div className="space-y-3 text-sm text-slate-600">
              <div><strong>Why it works:</strong> {pick.whyItWorks}</div>
              <div><strong>When to use:</strong> {pick.whenToUse}</div>
              <div><strong>Try today:</strong> {pick.tryToday}</div>
            </div>
            <div className="flex gap-2 mt-4">
              <Button size="sm" className="flex-1">
                {pick.type === 'Video' ? 'Watch' : pick.type === 'Printable' ? 'Download' : 'Read'}
              </Button>
              <Button variant="outline" size="sm" className="flex-1">
                Save
              </Button>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );

  const renderOrders = () => (
    <div className="space-y-3 sm:space-y-4 sm:space-y-6">
      <h1 className="text-2xl font-semibold text-slate-900">Orders & Saved Items</h1>
      
      <Tabs defaultValue="orders" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="orders">Recent Orders</TabsTrigger>
          <TabsTrigger value="saved">Saved Items</TabsTrigger>
          <TabsTrigger value="tracking">Order Tracking</TabsTrigger>
        </TabsList>
        
        <TabsContent value="orders" className="mt-4 sm:mt-6">
          <div className="space-y-3 sm:space-y-4">
            <p className="text-slate-600">No recent orders. Start shopping to see your order history here!</p>
          </div>
        </TabsContent>
        
        <TabsContent value="saved" className="mt-4 sm:mt-6">
          <div className="space-y-3 sm:space-y-4">
            {savedItems.length === 0 ? (
              <p className="text-slate-600">No saved items. Click the heart icon on any product to save it for later!</p>
            ) : (
              <div className="grid gap-3 sm:gap-4 sm:gap-6 md:grid-cols-2 lg:grid-cols-3">
                {savedItems.map((itemId) => {
                  const product = personalizedProducts.find(p => p.id === itemId);
                  return product ? (
                    <ProductCard
                      key={product.id}
                      product={product}
                      onSave={handleSaveItem}
                      onAddToPlan={handleAddToPlan}
                      onAddToJunior={handleAddToJunior}
                      isSaved={true}
                    />
                  ) : null;
                })}
              </div>
            )}
          </div>
        </TabsContent>
        
        <TabsContent value="tracking" className="mt-4 sm:mt-6">
          <div className="space-y-3 sm:space-y-4">
            <p className="text-slate-600">No active shipments to track.</p>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );

  const renderCart = () => {
    if (checkoutStep === 'cart') {
      return (
        <div className="space-y-3 sm:space-y-4 sm:space-y-6">
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-semibold text-slate-900">Shopping Cart</h1>
            <Button variant="ghost" size="sm" onClick={() => setActiveView('home')}>
              <X className="w-4 h-4 mr-2" />
              Close
            </Button>
          </div>
          
          {cartItems.length === 0 ? (
            <div className="text-center py-12">
              <ShoppingCart className="w-16 h-16 text-slate-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-slate-900 mb-2">Your cart is empty</h3>
              <p className="text-slate-600 mb-4">Add some items to get started!</p>
              <Button onClick={() => setActiveView('home')}>
                Continue Shopping
              </Button>
            </div>
          ) : (
            <div className="space-y-3 sm:space-y-4 sm:space-y-6">
              <div className="space-y-3 sm:space-y-4">
                {cartItems.map((item) => (
                  <Card key={item.id} className="p-3 sm:p-4">
                    <div className="flex items-center gap-3 sm:gap-4">
                      <div className="text-2xl">{item.image}</div>
                      <div className="flex-1">
                        <h3 className="font-medium text-slate-900">{item.title}</h3>
                        <p className="text-sm text-slate-600">
                          {item.type === 'bundle' ? 'Bundle' : 'Product'}
                        </p>
                        {item.items && (
                          <div className="text-xs text-slate-500 mt-1">
                            Includes: {item.items.join(', ')}
                          </div>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => updateCartQuantity(item.id, item.quantity - 1)}
                        >
                          <Minus className="w-3 h-3" />
                        </Button>
                        <span className="w-8 text-center">{item.quantity}</span>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => updateCartQuantity(item.id, item.quantity + 1)}
                        >
                          <Plus className="w-3 h-3" />
                        </Button>
                      </div>
                      <div className="text-right">
                        <p className="font-medium">${(item.price * item.quantity).toFixed(2)}</p>
                        {item.originalPrice && (
                          <p className="text-sm text-slate-500 line-through">
                            ${(item.originalPrice * item.quantity).toFixed(2)}
                          </p>
                        )}
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
              
              <div className="border-t pt-4">
                <div className="flex justify-between items-center mb-4">
                  <span className="text-lg font-semibold">Total: ${getCartTotal().toFixed(2)}</span>
                  <Button onClick={proceedToShipping} className="bg-accent hover:bg-accent/90 text-white">
                    Proceed to Checkout
                  </Button>
                </div>
              </div>
            </div>
          )}
        </div>
      );
    }

    if (checkoutStep === 'shipping') {
      return (
        <div className="space-y-3 sm:space-y-4 sm:space-y-6">
          <div className="flex items-center gap-3 sm:gap-4">
            <Button variant="ghost" size="sm" onClick={() => setCheckoutStep('cart')}>
              <ArrowLeft className="w-4 h-4" />
            </Button>
            <h1 className="text-2xl font-semibold text-slate-900">Shipping Information</h1>
          </div>
          
          <Card className="p-4 sm:p-5 md:p-6">
            <div className="space-y-3 sm:space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">First Name</label>
                  <Input
                    value={shippingInfo.firstName}
                    onChange={(e) => setShippingInfo({...shippingInfo, firstName: e.target.value})}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Last Name</label>
                  <Input
                    value={shippingInfo.lastName}
                    onChange={(e) => setShippingInfo({...shippingInfo, lastName: e.target.value})}
                  />
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Email</label>
                <Input
                  type="email"
                  value={shippingInfo.email}
                  onChange={(e) => setShippingInfo({...shippingInfo, email: e.target.value})}
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Address</label>
                <Input
                  value={shippingInfo.address}
                  onChange={(e) => setShippingInfo({...shippingInfo, address: e.target.value})}
                />
              </div>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 sm:gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">City</label>
                  <Input
                    value={shippingInfo.city}
                    onChange={(e) => setShippingInfo({...shippingInfo, city: e.target.value})}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">State</label>
                  <Input
                    value={shippingInfo.state}
                    onChange={(e) => setShippingInfo({...shippingInfo, state: e.target.value})}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">ZIP Code</label>
                  <Input
                    value={shippingInfo.zipCode}
                    onChange={(e) => setShippingInfo({...shippingInfo, zipCode: e.target.value})}
                  />
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Phone</label>
                <Input
                  type="tel"
                  value={shippingInfo.phone}
                  onChange={(e) => setShippingInfo({...shippingInfo, phone: e.target.value})}
                />
              </div>
            </div>
          </Card>
          
          <div className="flex justify-between">
            <Button variant="outline" onClick={() => setCheckoutStep('cart')}>
              Back to Cart
            </Button>
            <Button onClick={proceedToPayment} className="bg-accent hover:bg-accent/90 text-white">
              Continue to Payment
            </Button>
          </div>
        </div>
      );
    }

    if (checkoutStep === 'payment') {
      return (
        <div className="space-y-3 sm:space-y-4 sm:space-y-6">
          <div className="flex items-center gap-3 sm:gap-4">
            <Button variant="ghost" size="sm" onClick={() => setCheckoutStep('shipping')}>
              <ArrowLeft className="w-4 h-4" />
            </Button>
            <h1 className="text-2xl font-semibold text-slate-900">Payment Method</h1>
          </div>
          
          <Card className="p-4 sm:p-5 md:p-6">
            <div className="space-y-3 sm:space-y-4">
              {paymentMethods.map((method) => (
                <label key={method.id} className="flex items-center gap-3 sm:gap-4 p-4 border rounded-lg cursor-pointer hover:bg-gray-50">
                  <input
                    type="radio"
                    name="payment"
                    value={method.id}
                    checked={selectedPaymentMethod === method.id}
                    onChange={(e) => setSelectedPaymentMethod(e.target.value)}
                    className="w-4 h-4"
                  />
                  <div className="flex items-center gap-3">
                    {method.icon}
                    <div>
                      <div className="font-medium">{method.name}</div>
                      <div className="text-sm text-slate-500">{method.details}</div>
                    </div>
                  </div>
                </label>
              ))}
            </div>
          </Card>
          
          <Card className="p-4 sm:p-5 md:p-6">
            <h3 className="font-semibold mb-4">Order Summary</h3>
            <div className="space-y-2">
              {cartItems.map((item) => (
                <div key={item.id} className="flex justify-between text-sm">
                  <span>{item.title} × {item.quantity}</span>
                  <span>${(item.price * item.quantity).toFixed(2)}</span>
                </div>
              ))}
              <div className="border-t pt-2 flex justify-between font-semibold">
                <span>Total</span>
                <span>${getCartTotal().toFixed(2)}</span>
              </div>
            </div>
          </Card>
          
          <div className="flex justify-between">
            <Button variant="outline" onClick={() => setCheckoutStep('shipping')}>
              Back to Shipping
            </Button>
            <Button onClick={completeOrder} className="bg-accent hover:bg-accent/90 text-white">
              <Lock className="w-4 h-4 mr-2" />
              Complete Order
            </Button>
          </div>
        </div>
      );
    }

    if (checkoutStep === 'confirmation') {
      return (
        <div className="space-y-3 sm:space-y-4 sm:space-y-6 text-center">
          <div className="flex justify-center">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center">
              <Check className="w-8 h-8 text-green-600" />
            </div>
          </div>
          
          <div>
            <h1 className="text-2xl font-semibold text-slate-900 mb-2">Order Confirmed!</h1>
            <p className="text-slate-600">Thank you for your purchase. You'll receive an email confirmation shortly.</p>
          </div>
          
          <Card className="p-6 text-left">
            <h3 className="font-semibold mb-4">Order Details</h3>
            <div className="space-y-2">
              {cartItems.map((item) => (
                <div key={item.id} className="flex justify-between text-sm">
                  <span>{item.title} × {item.quantity}</span>
                  <span>${(item.price * item.quantity).toFixed(2)}</span>
                </div>
              ))}
              <div className="border-t pt-2 flex justify-between font-semibold">
                <span>Total</span>
                <span>${getCartTotal().toFixed(2)}</span>
              </div>
            </div>
          </Card>
          
          <Button onClick={() => setActiveView('home')} className="bg-accent hover:bg-accent/90 text-white">
            Continue Shopping
          </Button>
        </div>
      );
    }
  };

  // ProductCard component without "Use in Junior today" buttons
  const ProductCard = ({ product, onSave, onAddToPlan, onAddToJunior, isSaved }: ProductCardProps) => {
    const [showFullDescription, setShowFullDescription] = useState(false);
    const [addToCartAnimation, setAddToCartAnimation] = useState(false);

    const handleAddToCart = () => {
      addToCart(product);
      setAddToCartAnimation(true);
      setTimeout(() => setAddToCartAnimation(false), 300);
    };

    return (
      <Card className="p-6 hover:shadow-lg transition-all duration-200 relative">
        <div className="flex items-start justify-between mb-4">
          <div className="text-3xl">{product.image}</div>
          <div className="flex gap-1">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onSave(product.id)}
              className="text-slate-400 hover:text-red-500"
            >
              <Heart className={`w-4 h-4 ${isSaved ? 'fill-red-500 text-red-500' : ''}`} />
            </Button>
            <Button variant="ghost" size="sm" className="text-slate-400 hover:text-blue-500">
              <Share className="w-4 h-4" />
            </Button>
          </div>
        </div>

        <div className="space-y-3 mb-4">
          <div>
            <h3 className="font-semibold text-slate-900 mb-1">{product.title}</h3>
            <p className="text-sm text-slate-600">{product.description}</p>
          </div>

          <div className="flex items-center gap-2">
            <div className="flex items-center">
              {[...Array(5)].map((_, i) => (
                <Star
                  key={i}
                  className={`w-3 h-3 ${
                    i < Math.floor(product.rating) ? 'fill-yellow-400 text-yellow-400' : 'text-slate-400'
                  }`}
                />
              ))}
            </div>
            <span className="text-sm text-slate-600">
              {product.rating} ({product.reviews} reviews)
            </span>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {product.tags.map((tag: string, idx: number) => (
              <Badge key={idx} variant="outline" className="text-xs">
                {tag}
              </Badge>
            ))}
          </div>

          <div className="p-3 bg-accent/5 rounded-lg">
            <div className="flex items-start gap-2">
              <Target className="w-4 h-4 text-accent flex-shrink-0 mt-0.5" />
              <div className="text-sm text-slate-700">
                <strong>Why for {mockChildData.name}:</strong> {product.whyThisProduct}
              </div>
            </div>
          </div>

          {showFullDescription && (
            <div className="space-y-3 text-sm text-slate-600">
              <div>
                <strong>Evidence:</strong> {product.evidenceLevel}
              </div>
              <div>
                <strong>Targets:</strong> {product.targets}
              </div>
              <div>
                <strong>Use during:</strong> {product.useDuring.join(', ')}
              </div>
              {product.contraindications && (
                <div className="flex items-start gap-2 p-2 bg-amber-50 rounded">
                  <AlertTriangle className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
                  <div className="text-amber-800">
                    <strong>Note:</strong> {product.contraindications}
                  </div>
                </div>
              )}
              <div className="space-y-1">
                <strong>Safety callouts:</strong>
                {product.safetyCallouts.map((callout: string, idx: number) => (
                  <div key={idx} className="flex items-center gap-2">
                    <Shield className="w-3 h-3 text-blue-600" />
                    <span>{callout}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <span className="text-lg font-semibold text-slate-900">${product.price}</span>
            {product.originalPrice && (
              <span className="text-sm text-slate-500 line-through">${product.originalPrice}</span>
            )}
          </div>
          <div className="text-xs text-slate-500">
            {product.retailer} • {product.shipSpeed}
          </div>
        </div>

        {product.tryFirst && (
          <div className="mb-4 p-3 bg-blue-50 rounded-lg">
            <div className="flex items-start gap-2">
              <Lightbulb className="w-4 h-4 text-blue-600 flex-shrink-0 mt-0.5" />
              <div className="text-sm text-blue-900">
                <strong>Try first:</strong> {product.tryFirst}
              </div>
            </div>
          </div>
        )}

        <div className="space-y-2">
          <Button 
            className={`w-full bg-accent hover:bg-accent/90 text-white transition-all duration-300 ${
              addToCartAnimation ? 'scale-105 shadow-lg' : ''
            }`}
            onClick={handleAddToCart}
          >
            <ShoppingCart className="w-4 h-4 mr-2" />
            Add to Cart
          </Button>
          
          <div className="flex gap-2">
            <Button variant="outline" size="sm" className="flex-1" onClick={() => onAddToPlan(product)}>
              <Plus className="w-4 h-4 mr-1" />
              Add to Plan
            </Button>
            <Button 
              variant="outline" 
              size="sm" 
              className="flex-1"
              onClick={() => setShowFullDescription(!showFullDescription)}
            >
              <Eye className="w-4 h-4 mr-1" />
              {showFullDescription ? 'Less' : 'Details'}
            </Button>
          </div>
        </div>

        {product.affiliateLink && (
          <div className="mt-3 text-xs text-slate-500 text-center">
            <Shield className="w-3 h-3 inline mr-1" />
            Affiliate link - supports Aminy at no extra cost
          </div>
        )}
      </Card>
    );
  };

  return (
    <div className="min-h-screen bg-gray-50 overflow-x-hidden">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="px-4 py-4 sm:px-6">
          <div className="max-w-6xl mx-auto">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onNavigate?.('more')}
                  className="text-slate-600 hover:text-slate-900"
                >
                  <ArrowLeft className="w-4 h-4" />
                </Button>
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 bg-gradient-to-r from-green-500 to-teal-500 rounded-full flex items-center justify-center">
                    <ShoppingBag className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <h1 className="text-lg sm:text-xl font-semibold text-slate-900">Shop</h1>
                    <p className="text-sm text-slate-600">AI-guided product discovery</p>
                  </div>
                </div>
              </div>
              
              {/* Navigation Tabs */}
              <div className="hidden md:flex items-center space-x-1">
                <Button
                  variant={activeView === 'home' ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => setActiveView('home')}
                >
                  Home
                </Button>
                <Button
                  variant={activeView === 'categories' ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => setActiveView('categories')}
                >
                  Categories
                </Button>
                <Button
                  variant={activeView === 'search' ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => setActiveView('search')}
                >
                  Search
                </Button>
                <Button
                  variant={activeView === 'learn' ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => setActiveView('learn')}
                >
                  Learn
                </Button>
                <Button
                  variant={activeView === 'orders' ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => setActiveView('orders')}
                >
                  Orders & Saved
                </Button>
              </div>
              
              <div className="flex items-center space-x-2">
                <Button 
                  variant="ghost" 
                  size="sm"
                  onClick={handleCheckout}
                  className="relative"
                >
                  <ShoppingCart className="w-4 h-4" />
                  {getCartItemCount() > 0 && (
                    <Badge 
                      className={`absolute -top-2 -right-2 h-5 w-5 flex items-center justify-center p-0 text-xs bg-accent text-white ${showCartBadge ? 'animate-pulse' : ''}`}
                    >
                      {getCartItemCount()}
                    </Badge>
                  )}
                </Button>
                <Button variant="ghost" size="sm">
                  <Bell className="w-4 h-4" />
                </Button>
                <div className="w-8 h-8 bg-slate-100 rounded-full flex items-center justify-center">
                  <User className="w-4 h-4 text-slate-600" />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Mobile Navigation */}
      <div className="md:hidden bg-white border-b border-gray-200">
        <div className="px-4 py-2">
          <div className="flex space-x-1 overflow-x-auto">
            {['home', 'categories', 'search', 'learn', 'orders'].map((view) => (
              <Button
                key={view}
                variant={activeView === view ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setActiveView(view)}
                className="whitespace-nowrap"
              >
                {view === 'home' ? 'Home' : 
                 view === 'categories' ? 'Categories' :
                 view === 'search' ? 'Search' :
                 view === 'learn' ? 'Learn' :
                 'Orders'}
              </Button>
            ))}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="px-4 py-6 sm:px-6 max-w-6xl mx-auto">
        {activeView === 'home' && renderPersonalizedHome()}
        {activeView === 'categories' && renderCategories()}
        {activeView === 'search' && renderSearch()}
        {activeView === 'learn' && renderLearn()}
        {activeView === 'orders' && renderOrders()}
        {activeView === 'cart' && renderCart()}
      </div>

      {/* Enhanced Disclaimer Footer */}
      <div className="mt-12 bg-blue-50 border-t border-blue-200">
        <div className="px-4 py-6 sm:px-6 max-w-6xl mx-auto">
          <div className="space-y-3 sm:space-y-4">
            <div className="flex items-start gap-3">
              <Shield className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
              <div className="text-sm text-blue-900">
                <strong>Transparency:</strong> Some links are affiliate partnerships; we may earn a small commission—your price stays the same. We only recommend items that match your child's plan and meet our quality standards.
              </div>
            </div>
            
            <div className="flex items-start gap-3">
              <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
              <div className="text-sm text-green-900">
                <strong>Aminy-Approved Program:</strong> Products undergo safety checks, school-friendliness review, and maintain parent ratings ≥4.2 with ≥25 reviews.
              </div>
            </div>
            
            <div className="flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
              <div className="text-sm text-amber-900">
                <strong>Safety Note:</strong> Always follow age recommendations and supervision guidelines. Products marked "New—under review" are still being evaluated.
              </div>
            </div>
            
            <div className="text-xs text-slate-600 border-t pt-3">
              Educational support, not medical advice. Regional availability, pricing, and safety standards may vary. Always consult your child's care team for medical decisions.
            </div>
            
            {/* Analytics Tracking Notice */}
            <div className="text-xs text-slate-500">
              We track product views and purchases to improve recommendations. Data helps us understand what works for families like yours.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
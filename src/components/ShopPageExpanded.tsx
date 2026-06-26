import React, { useState } from 'react';
import { Card } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from './ui/sheet';
import { 
  Sparkles, 
  ShoppingCart, 
  Star,
  Download,
  Puzzle,
  Book,
  Palette,
  TrendingUp,
  CreditCard,
  CheckCircle,
  Heart,
  Target,
  Zap
} from 'lucide-react';
import { toast } from 'sonner';

interface ShopPageExpandedProps {
  userData: {
    parentName: string;
    childName: string;
  };
  userTier: string;
  childGoals?: string[];
}

interface CalmCoinsTransaction {
  date: string;
  activity: string;
  amount: number;
  type: 'earned' | 'spent';
}

interface ShopItem {
  id: string;
  name: string;
  description: string;
  price: number;
  category: 'calm-kit' | 'printable' | 'jr-addon' | 'premium';
  image: string;
  tier?: 'starter' | 'core' | 'pro';
  aiSuggested?: boolean;
  tags: string[];
}

export function ShopPageExpanded({ userData, userTier, childGoals = [] }: ShopPageExpandedProps) {
  const [calmCoinsBalance, setCalmCoinsBalance] = useState(247);
  const [selectedItem, setSelectedItem] = useState<ShopItem | null>(null);
  const [showCheckout, setShowCheckout] = useState(false);
  const [cartItems, setCartItems] = useState<ShopItem[]>([]);

  const [transactions] = useState<CalmCoinsTransaction[]>([
    { date: '2024-10-27', activity: 'Aminy Jr - Speech Buddy', amount: 15, type: 'earned' },
    { date: '2024-10-27', activity: 'Daily calm plan completed', amount: 10, type: 'earned' },
    { date: '2024-10-26', activity: 'Morning routine streak (7 days)', amount: 50, type: 'earned' },
    { date: '2024-10-25', activity: 'Calm Quest game', amount: 20, type: 'earned' },
    { date: '2024-10-24', activity: 'Visual schedule printable', amount: -30, type: 'spent' }
  ]);

  const shopItems: ShopItem[] = [
    {
      id: 'morning-calm-kit',
      name: 'Morning Calm Kit',
      description: 'Visual schedule cards, reward chart, and morning routine checklist',
      price: 45,
      category: 'calm-kit',
      image: '📅',
      aiSuggested: childGoals.includes('morning routines'),
      tags: ['routines', 'visual supports', 'mornings']
    },
    {
      id: 'transition-timer',
      name: 'Transition Timer Printables',
      description: '5-minute, 10-minute, and 15-minute visual timers with calm cues',
      price: 20,
      category: 'printable',
      image: '⏰',
      aiSuggested: childGoals.includes('transitions'),
      tags: ['transitions', 'time management', 'visual supports']
    },
    {
      id: 'feelings-chart',
      name: 'Feelings Chart Bundle',
      description: 'Emotion flashcards, feelings thermometer, and calm-down strategies',
      price: 35,
      category: 'printable',
      image: '😊',
      aiSuggested: childGoals.includes('emotional regulation'),
      tags: ['emotions', 'communication', 'self-regulation']
    },
    {
      id: 'jr-speech-expansion',
      name: 'Speech Buddy Expansion Pack',
      description: '50 new phrases, custom recordings, and parent progress tracking',
      price: 99,
      category: 'jr-addon',
      image: '🎤',
      tier: 'core',
      tags: ['speech', 'aminy jr', 'communication']
    },
    {
      id: 'jr-calm-adventures',
      name: 'Calm Adventures Premium',
      description: '10 new breathing games, nature sounds, and guided meditations',
      price: 79,
      category: 'jr-addon',
      image: '🌈',
      tier: 'core',
      tags: ['calm', 'aminy jr', 'mindfulness']
    },
    {
      id: 'sensory-toolkit',
      name: 'Sensory Toolkit',
      description: 'Sensory diet cards, tracking sheets, and activity ideas',
      price: 55,
      category: 'calm-kit',
      image: '🎨',
      aiSuggested: childGoals.includes('sensory'),
      tags: ['sensory', 'activities', 'regulation']
    },
    {
      id: 'social-stories',
      name: 'Social Stories Library',
      description: '20 customizable social stories for common situations',
      price: 40,
      category: 'printable',
      image: '📖',
      tier: 'starter',
      tags: ['social skills', 'stories', 'learning']
    },
    {
      id: 'reward-system',
      name: 'Token Economy System',
      description: 'Token boards, reward menus, and reinforcement tracking',
      price: 50,
      category: 'calm-kit',
      image: '⭐',
      aiSuggested: true,
      tags: ['reinforcement', 'motivation', 'aba']
    },
    {
      id: 'bedtime-bundle',
      name: 'Bedtime Calm Bundle',
      description: 'Bedtime routine chart, dream journal, and relaxation cards',
      price: 38,
      category: 'calm-kit',
      image: '🌙',
      aiSuggested: childGoals.includes('bedtime'),
      tags: ['bedtime', 'sleep', 'routines']
    },
    {
      id: 'pro-report-templates',
      name: 'Professional Report Templates',
      description: 'IEP goals, progress notes, and BCBA documentation templates',
      price: 149,
      category: 'premium',
      image: '📊',
      tier: 'pro',
      tags: ['professional', 'documentation', 'reports']
    }
  ];

  const handleAddToCart = (item: ShopItem) => {
    setCartItems(prev => [...prev, item]);
    toast.success(`Added ${item.name} to cart`);
  };

  const handlePurchase = (item: ShopItem) => {
    setSelectedItem(item);
    setShowCheckout(true);
  };

  const handleCheckoutComplete = () => {
    setShowCheckout(false);
    toast.success('Purchase complete! Check your email for download links. 🎉');
    setCartItems([]);
  };

  const aiSuggestedItems = shopItems.filter(item => item.aiSuggested);
  const calmKits = shopItems.filter(item => item.category === 'calm-kit');
  const printables = shopItems.filter(item => item.category === 'printable');
  const jrAddons = shopItems.filter(item => item.category === 'jr-addon');

  return (
    <div className="min-h-screen bg-gradient-to-b from-white to-slate-50 pb-20">
      {/* Header with Calm Coins Wallet */}
      <div className="bg-gradient-to-r from-accent/10 to-teal-50 border-b border-accent/20 px-6 py-8">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-between mb-4 sm:mb-6">
            <div>
              <h1 className="text-3xl font-semibold text-[#132F43] mb-2">Shop</h1>
              <p className="text-[#5A6B7A]">Science-backed calm tools for home</p>
            </div>
            <Button variant="outline" size="sm" className="gap-2">
              <ShoppingCart className="w-4 h-4" />
              {cartItems.length > 0 && (
                <Badge className="bg-accent text-white ml-1">{cartItems.length}</Badge>
              )}
            </Button>
          </div>

          {/* Calm Coins Wallet */}
          <Card className="p-6 bg-gradient-to-br from-yellow-50 to-amber-50 border-[#F0EDE8]">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-gradient-to-br from-yellow-400 to-amber-500 rounded-full flex items-center justify-center">
                  <Sparkles className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h3 className="font-semibold text-[#132F43]">Calm Coins Balance</h3>
                  <p className="text-sm text-[#5A6B7A]">Earn by completing activities</p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-4xl font-bold text-amber-600">{calmCoinsBalance}</p>
                <p className="text-sm text-[#5A6B7A]">coins</p>
              </div>
            </div>

            {/* Recent Transactions */}
            <div className="mt-4 pt-4 border-t border-[#F0EDE8]">
              <p className="text-sm font-medium text-[#3A4A57] mb-2">Recent Activity</p>
              <div className="space-y-2 max-h-32 overflow-y-auto">
                {transactions.slice(0, 3).map((tx, idx) => (
                  <div key={idx} className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2">
                      {tx.type === 'earned' ? (
                        <TrendingUp className="w-3 h-3 text-green-600" />
                      ) : (
                        <ShoppingCart className="w-3 h-3 text-blue-600" />
                      )}
                      <span className="text-[#3A4A57] text-sm">{tx.activity}</span>
                    </div>
                    <span className={`font-semibold ${tx.type === 'earned' ? 'text-green-600' : 'text-blue-600'}`}>
                      {tx.type === 'earned' ? '+' : ''}{tx.amount}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </Card>
        </div>
      </div>

      {/* Shop Content */}
      <div className="max-w-7xl mx-auto px-6 py-8">
        
        {/* AI Suggested Items */}
        {aiSuggestedItems.length > 0 && (
          <div className="mb-8">
            <div className="flex items-center gap-2 mb-4">
              <Sparkles className="w-5 h-5 text-accent" />
              <h2 className="text-lg sm:text-xl font-semibold text-[#132F43]">Suggested for {userData.childName}</h2>
              <Badge className="bg-accent/10 text-accent border-accent/20">AI Powered</Badge>
            </div>
            <p className="text-sm text-[#5A6B7A] mb-4">
              Based on your current calm plan goals and progress
            </p>
            
            <div className="grid md:grid-cols-3 gap-3 sm:gap-4">
              {aiSuggestedItems.slice(0, 3).map(item => (
                <Card key={item.id} className="p-5 hover:shadow-lg transition-all border-accent/20 bg-gradient-to-br from-accent/5 to-teal-50">
                  <div className="flex items-start justify-between mb-3">
                    <div className="text-4xl">{item.image}</div>
                    <Badge className="bg-accent text-white">AI Pick</Badge>
                  </div>
                  
                  <h3 className="font-semibold text-[#132F43] mb-2">{item.name}</h3>
                  <p className="text-sm text-[#5A6B7A] mb-4">{item.description}</p>
                  
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="text-xl sm:text-2xl font-bold text-accent">${item.price}</span>
                    </div>
                    <Button
                      onClick={() => handlePurchase(item)}
                      size="sm"
                      className="bg-accent hover:bg-accent/90"
                    >
                      Buy Now
                    </Button>
                  </div>
                </Card>
              ))}
            </div>
          </div>
        )}

        {/* Tabbed Shop */}
        <Tabs defaultValue="all" className="space-y-3 sm:space-y-4 sm:space-y-6">
          <TabsList className="grid w-full grid-cols-5 gap-2">
            <TabsTrigger value="all">All Items</TabsTrigger>
            <TabsTrigger value="kits">Calm Kits</TabsTrigger>
            <TabsTrigger value="printables">Printables</TabsTrigger>
            <TabsTrigger value="jr">Jr Add-ons</TabsTrigger>
            <TabsTrigger value="premium">Premium</TabsTrigger>
          </TabsList>

          {/* All Items */}
          <TabsContent value="all">
            <div className="grid md:grid-cols-3 gap-3 sm:gap-4 sm:gap-6">
              {shopItems.map(item => (
                <ShopItemCard
                  key={item.id}
                  item={item}
                  onPurchase={handlePurchase}
                  onAddToCart={handleAddToCart}
                  userTier={userTier}
                />
              ))}
            </div>
          </TabsContent>

          {/* Calm Kits */}
          <TabsContent value="kits">
            <div className="grid md:grid-cols-3 gap-3 sm:gap-4 sm:gap-6">
              {calmKits.map(item => (
                <ShopItemCard
                  key={item.id}
                  item={item}
                  onPurchase={handlePurchase}
                  onAddToCart={handleAddToCart}
                  userTier={userTier}
                />
              ))}
            </div>
          </TabsContent>

          {/* Printables */}
          <TabsContent value="printables">
            <div className="grid md:grid-cols-3 gap-3 sm:gap-4 sm:gap-6">
              {printables.map(item => (
                <ShopItemCard
                  key={item.id}
                  item={item}
                  onPurchase={handlePurchase}
                  onAddToCart={handleAddToCart}
                  userTier={userTier}
                />
              ))}
            </div>
          </TabsContent>

          {/* Jr Add-ons */}
          <TabsContent value="jr">
            <div className="mb-4 p-4 bg-gradient-to-r from-[#C9EAD9]/20 to-[#FFE2B6]/20 rounded-lg border border-accent/20">
              <div className="flex items-start gap-3">
                <Sparkles className="w-5 h-5 text-accent mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-[#132F43] mb-1">
                    Expand your child's Aminy Jr experience
                  </p>
                  <p className="text-sm text-[#5A6B7A]">
                    Premium games and activities designed by behavior specialists
                  </p>
                </div>
              </div>
            </div>
            
            <div className="grid md:grid-cols-3 gap-3 sm:gap-4 sm:gap-6">
              {jrAddons.map(item => (
                <ShopItemCard
                  key={item.id}
                  item={item}
                  onPurchase={handlePurchase}
                  onAddToCart={handleAddToCart}
                  userTier={userTier}
                />
              ))}
            </div>
          </TabsContent>

          {/* Premium */}
          <TabsContent value="premium">
            <div className="mb-4 p-4 bg-gradient-to-r from-purple-50 to-blue-50 rounded-lg border border-purple-200">
              <div className="flex items-start gap-3">
                <Star className="w-5 h-5 text-purple-600 mt-0.5 fill-purple-600" />
                <div>
                  <p className="text-sm font-medium text-[#132F43] mb-1">
                    Professional-grade tools and templates
                  </p>
                  <p className="text-sm text-[#5A6B7A]">
                    Clinical documentation, IEP support, and provider-ready materials
                  </p>
                </div>
              </div>
            </div>
            
            <div className="grid md:grid-cols-3 gap-3 sm:gap-4 sm:gap-6">
              {shopItems.filter(item => item.category === 'premium').map(item => (
                <ShopItemCard
                  key={item.id}
                  item={item}
                  onPurchase={handlePurchase}
                  onAddToCart={handleAddToCart}
                  userTier={userTier}
                />
              ))}
            </div>
          </TabsContent>
        </Tabs>

        {/* Support Message */}
        <Card className="mt-8 p-6 bg-gradient-to-r from-accent/5 to-teal-50 border-accent/20 text-center">
          <Heart className="w-8 h-8 text-accent mx-auto mb-3" />
          <h3 className="font-semibold text-[#132F43] mb-2">Every purchase supports your family's progress plan</h3>
          <p className="text-sm text-[#5A6B7A]">
            All materials are science-backed and designed by ABA professionals to integrate seamlessly with your calm plan.
          </p>
        </Card>
      </div>

      {/* Checkout Modal */}
      <CheckoutModal
        isOpen={showCheckout}
        onClose={() => setShowCheckout(false)}
        item={selectedItem}
        onComplete={handleCheckoutComplete}
        calmCoinsBalance={calmCoinsBalance}
      />
    </div>
  );
}

// Shop Item Card Component
function ShopItemCard({ 
  item, 
  onPurchase, 
  onAddToCart,
  userTier
}: { 
  item: ShopItem; 
  onPurchase: (item: ShopItem) => void;
  onAddToCart: (item: ShopItem) => void;
  userTier: string;
}) {
  const getTierBadge = () => {
    if (!item.tier) return null;
    
    const colors = {
      starter: 'bg-blue-500',
      core: 'bg-accent',
      pro: 'bg-purple-500'
    };

    return (
      <Badge className={`${colors[item.tier]} text-white`}>
        {item.tier.charAt(0).toUpperCase() + item.tier.slice(1)}+
      </Badge>
    );
  };

  return (
    <Card className="p-5 hover:shadow-lg transition-all">
      <div className="flex items-start justify-between mb-3">
        <div className="text-5xl">{item.image}</div>
        {item.aiSuggested ? (
          <Badge className="bg-accent/10 text-accent border-accent/20">
            <Sparkles className="w-3 h-3 mr-1" />
            AI Pick
          </Badge>
        ) : getTierBadge()}
      </div>
      
      <h3 className="font-semibold text-[#132F43] mb-2">{item.name}</h3>
      <p className="text-sm text-[#5A6B7A] mb-4 line-clamp-2">{item.description}</p>
      
      <div className="flex flex-wrap gap-1 mb-4">
        {item.tags.slice(0, 3).map((tag, idx) => (
          <Badge key={idx} variant="outline" className="text-sm">
            {tag}
          </Badge>
        ))}
      </div>
      
      <div className="flex items-center justify-between pt-4 border-t border-[#E8E4DF]">
        <div>
          <span className="text-xl sm:text-2xl font-bold text-[#132F43]">${item.price}</span>
        </div>
        <div className="flex gap-2">
          <Button
            onClick={() => onAddToCart(item)}
            size="sm"
            variant="outline"
          >
            <ShoppingCart className="w-4 h-4" />
          </Button>
          <Button
            onClick={() => onPurchase(item)}
            size="sm"
            className="bg-accent hover:bg-accent/90"
          >
            Buy Now
          </Button>
        </div>
      </div>
    </Card>
  );
}

// Checkout Modal Component
function CheckoutModal({ 
  isOpen, 
  onClose, 
  item, 
  onComplete,
  calmCoinsBalance
}: { 
  isOpen: boolean; 
  onClose: () => void; 
  item: ShopItem | null;
  onComplete: () => void;
  calmCoinsBalance: number;
}) {
  const [paymentMethod, setPaymentMethod] = useState<'card' | 'coins'>('card');

  if (!item) return null;

  const canAffordWithCoins = calmCoinsBalance >= item.price;

  return (
    <Sheet open={isOpen} onOpenChange={onClose}>
      <SheetContent side="bottom" className="h-[90vh] rounded-t-2xl">
        <SheetHeader>
          <SheetTitle>Complete Purchase</SheetTitle>
        </SheetHeader>

        <div className="mt-4 sm:mt-6 space-y-3 sm:space-y-4 sm:space-y-6">
          {/* Item Summary */}
          <Card className="p-4 bg-[#FAF7F2]">
            <div className="flex items-center gap-3 sm:gap-4">
              <div className="text-4xl">{item.image}</div>
              <div className="flex-1">
                <h3 className="font-semibold text-[#132F43]">{item.name}</h3>
                <p className="text-sm text-[#5A6B7A]">{item.category}</p>
              </div>
              <div className="text-right">
                <p className="text-xl sm:text-2xl font-bold text-[#132F43]">${item.price}</p>
              </div>
            </div>
          </Card>

          {/* Payment Method */}
          <div>
            <h4 className="font-medium text-[#132F43] mb-3">Payment Method</h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Card 
                onClick={() => setPaymentMethod('card')}
                className={`p-4 cursor-pointer transition-all ${
                  paymentMethod === 'card' 
                    ? 'border-2 border-accent bg-accent/5' 
                    : 'border border-[#E8E4DF]'
                }`}
              >
                <div className="flex items-center gap-3">
                  <CreditCard className="w-5 h-5 text-[#3A4A57]" />
                  <div>
                    <p className="font-medium text-[#132F43]">Credit Card</p>
                    <p className="text-sm text-[#5A6B7A]">Stripe checkout</p>
                  </div>
                  {paymentMethod === 'card' && (
                    <CheckCircle className="w-5 h-5 text-accent ml-auto" />
                  )}
                </div>
              </Card>

              <Card 
                onClick={() => canAffordWithCoins && setPaymentMethod('coins')}
                className={`p-4 cursor-pointer transition-all ${
                  !canAffordWithCoins ? 'opacity-50' :
                  paymentMethod === 'coins' 
                    ? 'border-2 border-yellow-500 bg-[#FDF9F0]' 
                    : 'border border-[#E8E4DF]'
                }`}
              >
                <div className="flex items-center gap-3">
                  <Sparkles className="w-5 h-5 text-yellow-600" />
                  <div>
                    <p className="font-medium text-[#132F43]">Calm Coins</p>
                    <p className="text-sm text-[#5A6B7A]">{calmCoinsBalance} available</p>
                  </div>
                  {paymentMethod === 'coins' && canAffordWithCoins && (
                    <CheckCircle className="w-5 h-5 text-yellow-600 ml-auto" />
                  )}
                </div>
              </Card>
            </div>
          </div>

          {/* Stripe Flow Stub */}
          {paymentMethod === 'card' && (
            <Card className="p-4 bg-[#EEF4F8] border-[#C8DDE8]">
              <div className="flex items-start gap-3">
                <CreditCard className="w-5 h-5 text-blue-600 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-blue-900 mb-1">Secure Stripe Checkout</p>
                  <p className="text-sm text-blue-700">
                    You'll be redirected to our secure payment processor to complete your purchase.
                  </p>
                </div>
              </div>
            </Card>
          )}

          {/* Purchase Button */}
          <Button
            onClick={onComplete}
            size="lg"
            className="w-full bg-accent hover:bg-accent/90"
            disabled={paymentMethod === 'coins' && !canAffordWithCoins}
          >
            {paymentMethod === 'card' ? (
              <>
                <CreditCard className="w-5 h-5 mr-2" />
                Continue to Stripe
              </>
            ) : (
              <>
                <Sparkles className="w-5 h-5 mr-2" />
                Pay with Calm Coins
              </>
            )}
          </Button>

          {/* Purchase Confirmation Note */}
          <p className="text-sm text-[#5A6B7A] text-center">
            Digital products will be emailed to you immediately. Physical items ship within 2-3 business days.
          </p>
        </div>
      </SheetContent>
    </Sheet>
  );
}

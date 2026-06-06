import React from 'react';
import { Star, ShieldCheck, Video, MapPin, Calendar } from 'lucide-react';
import { Button } from '../ui/button';

export interface ProviderProfile {
    id: string;
    first_name: string;
    last_name: string;
    title: string;
    avatar_url: string;
    hourly_rate: number;
    rating: number;
}

interface ProviderMatchCardProps {
    providers: ProviderProfile[];
    onBookProvider: (providerId: string) => void;
}

export function ProviderMatchCard({ providers, onBookProvider }: ProviderMatchCardProps) {
    if (!providers || providers.length === 0) return null;

    return (
        <div className="bg-white rounded-2xl border border-accent/20 overflow-hidden shadow-sm mt-2 mb-4">
            <div className="bg-accent/5 px-4 py-3 border-b border-accent/10 flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-accent" />
                <h4 className="font-medium text-[#1B2733]">Recommended Matches</h4>
            </div>

            <div className="p-4 flex gap-4 overflow-x-auto snap-x pb-4 -mx-4 px-4 scrollbar-hide">
                {providers.map((provider) => (
                    <div
                        key={provider.id}
                        className="flex-shrink-0 w-64 bg-[#FAF7F2] rounded-xl border border-[#E8E4DF] p-4 snap-start relative group hover:border-accent/50 transition-colors"
                    >
                        <div className="flex gap-3 mb-3">
                            <div className="w-12 h-12 rounded-full overflow-hidden bg-accent/10 border-2 border-white shadow-sm flex-shrink-0">
                                {provider.avatar_url ? (
                                    <img src={provider.avatar_url} alt={provider.first_name} className="w-full h-full object-cover" />
                                ) : (
                                    <div className="w-full h-full flex items-center justify-center text-accent font-medium">
                                        {provider.first_name[0]}{provider.last_name[0]}
                                    </div>
                                )}
                            </div>
                            <div>
                                <h5 className="font-semibold text-[#1B2733] leading-tight">
                                    {provider.first_name} {provider.last_name}
                                </h5>
                                <p className="text-xs text-[#5A6B7A] font-medium">{provider.title}</p>
                                <div className="flex items-center gap-1 mt-1">
                                    <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
                                    <span className="text-xs font-medium text-[#3A4A57]">{provider.rating.toFixed(1)}</span>
                                </div>
                            </div>
                        </div>

                        <div className="space-y-2 mb-4">
                            <div className="flex items-center gap-2 text-xs text-[#5A6B7A]">
                                <Video className="w-3.5 h-3.5 text-slate-400" />
                                <span>Telehealth Available</span>
                            </div>
                            <div className="flex items-center gap-2 text-xs text-[#5A6B7A]">
                                <ShieldCheck className="w-3.5 h-3.5 text-slate-400" />
                                <span>In-Network Match</span>
                            </div>
                            <div className="flex items-center gap-2 text-xs text-[#5A6B7A]">
                                <Calendar className="w-3.5 h-3.5 text-slate-400" />
                                <span className="text-emerald-600 font-medium">Usually available in 24h</span>
                            </div>
                        </div>

                        <Button
                            className="w-full bg-accent hover:bg-accent/90 text-white rounded-xl shadow-sm text-sm"
                            onClick={() => onBookProvider(provider.id)}
                        >
                            Book Evaluation
                        </Button>
                    </div>
                ))}
            </div>
        </div>
    );
}

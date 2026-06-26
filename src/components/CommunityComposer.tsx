// Copyright (c) 2024-2026 Aminy LLC. All Rights Reserved.
// CONFIDENTIAL AND PROPRIETARY — Trade Secret of Aminy LLC
// Unauthorized use, reproduction, or distribution is strictly prohibited.
// See LICENSE file for details.

import React, { useState, useEffect, useRef } from 'react';
import { Button } from './ui/button';
import { Textarea } from './ui/textarea';
import { Input } from './ui/input';
import { Badge } from './ui/badge';
import { Switch } from './ui/switch';
import { Label } from './ui/label';
import { Card } from './ui/card';
import {
  Send,
  AlertCircle,
  ImagePlus,
  X,
  Save,
  FileImage,
  Loader2
} from 'lucide-react';
import { toast } from 'sonner';

// Image validation and upload types
interface ImagePreview {
  id: string;
  file: File;
  url: string;
  uploading?: boolean;
  uploadedUrl?: string;
  error?: string;
}

const MAX_IMAGES = 4;
const MAX_IMAGE_SIZE = 5 * 1024 * 1024; // 5MB
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];

// Upload image to Supabase Storage or fallback to data URL
async function uploadImageToStorage(file: File, userId?: string): Promise<string> {
  try {
    // Try Supabase Storage first
    const { supabase } = await import('../utils/supabase/client');

    const fileExt = file.name.split('.').pop()?.toLowerCase() || 'jpg';
    const fileName = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}.${fileExt}`;
    const filePath = `community/${userId || 'anonymous'}/${fileName}`;

    const { data, error } = await supabase.storage
      .from('community-images')
      .upload(filePath, file, {
        cacheControl: '3600',
        upsert: false,
        contentType: file.type,
      });

    if (error) {
      console.warn('Supabase upload failed, using data URL fallback:', error);
      throw error;
    }

    // Get public URL
    const { data: urlData } = supabase.storage
      .from('community-images')
      .getPublicUrl(data.path);

    return urlData.publicUrl;
  } catch (error) {
    // Fallback to data URL for local/demo mode
    console.warn('Using data URL fallback for image');
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        if (typeof reader.result === 'string') {
          resolve(reader.result);
        } else {
          reject(new Error('Failed to read file'));
        }
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }
}

interface CommunityComposerProps {
  onPost: (content: { title: string; body: string; tags: string[]; anonymous: boolean; removeNames: boolean; imageUrls?: string[] }) => void;
  onCancel: () => void;
  userId?: string;
}

export function CommunityComposer({ onPost, onCancel, userId }: CommunityComposerProps) {
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [removeNames, setRemoveNames] = useState(true); // ON by default as per spec
  const [anonymous, setAnonymous] = useState(false);
  const [characterCount, setCharacterCount] = useState(0);
  const [hasDraft, setHasDraft] = useState(false);
  const [images, setImages] = useState<ImagePreview[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const CHARACTER_LIMIT = 500;

  const tags = ['Routines', 'Sensory', 'Communication', 'School', 'Community', 'Self-care'];

  // Validate image file
  const validateImage = (file: File): { valid: boolean; error?: string } => {
    if (!ALLOWED_TYPES.includes(file.type)) {
      return { valid: false, error: 'Only JPEG, PNG, WebP, and GIF images are allowed' };
    }
    if (file.size > MAX_IMAGE_SIZE) {
      return { valid: false, error: 'Image must be less than 5MB' };
    }
    return { valid: true };
  };

  // Handle image selection
  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);

    if (images.length + files.length > MAX_IMAGES) {
      toast.error(`You can only add up to ${MAX_IMAGES} images`);
      return;
    }

    const newImages: ImagePreview[] = [];
    const errors: string[] = [];

    files.forEach(file => {
      const validation = validateImage(file);
      if (!validation.valid) {
        errors.push(`${file.name}: ${validation.error}`);
      } else {
        newImages.push({
          id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          file,
          url: URL.createObjectURL(file),
        });
      }
    });

    if (errors.length > 0) {
      toast.error(errors.join('\n'));
    }

    if (newImages.length > 0) {
      setImages(prev => [...prev, ...newImages]);
    }

    // Reset input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // Remove image
  const removeImage = (imageId: string) => {
    setImages(prev => {
      const toRemove = prev.find(img => img.id === imageId);
      if (toRemove) {
        URL.revokeObjectURL(toRemove.url);
      }
      return prev.filter(img => img.id !== imageId);
    });
  };

  // Upload images to storage
  const uploadImages = async (): Promise<string[]> => {
    if (images.length === 0) return [];

    setIsUploading(true);
    const uploadedUrls: string[] = [];

    try {
      for (const image of images) {
        // Mark as uploading
        setImages(prev =>
          prev.map(img =>
            img.id === image.id ? { ...img, uploading: true } : img
          )
        );

        // For now, we'll use data URLs as a fallback
        // In production, this would upload to Supabase Storage
        const uploadedUrl = await uploadImageToStorage(image.file, userId);

        uploadedUrls.push(uploadedUrl);

        // Mark as uploaded
        setImages(prev =>
          prev.map(img =>
            img.id === image.id
              ? { ...img, uploading: false, uploadedUrl }
              : img
          )
        );
      }

      return uploadedUrls;
    } catch (error) {
      console.error('Image upload error:', error);
      toast.error('Failed to upload some images');
      return uploadedUrls;
    } finally {
      setIsUploading(false);
    }
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      images.forEach(img => URL.revokeObjectURL(img.url));
    };
  }, []);

  // Auto-save drafts to localStorage
  useEffect(() => {
    const draftKey = 'community-draft';
    
    // Save draft every 2 seconds if there's content
    const saveDraft = () => {
      if (title || body || selectedTags.length > 0) {
        localStorage.setItem(draftKey, JSON.stringify({
          title,
          body,
          selectedTags,
          removeNames,
          anonymous,
          timestamp: Date.now()
        }));
        setHasDraft(true);
      }
    };

    const draftTimer = setTimeout(saveDraft, 2000);
    return () => clearTimeout(draftTimer);
  }, [title, body, selectedTags, removeNames, anonymous]);

  // Load draft on mount
  useEffect(() => {
    const draftKey = 'community-draft';
    const savedDraft = localStorage.getItem(draftKey);
    
    if (savedDraft) {
      try {
        const draft = JSON.parse(savedDraft);
        // Only load if draft is less than 24 hours old
        if (Date.now() - draft.timestamp < 24 * 60 * 60 * 1000) {
          setHasDraft(true);
        }
      } catch (e) {
        console.error('Failed to load draft:', e);
      }
    }
  }, []);

  // Character count update
  useEffect(() => {
    setCharacterCount(body.length);
  }, [body]);

  const loadDraft = () => {
    const draftKey = 'community-draft';
    const savedDraft = localStorage.getItem(draftKey);
    
    if (savedDraft) {
      try {
        const draft = JSON.parse(savedDraft);
        setTitle(draft.title || '');
        setBody(draft.body || '');
        setSelectedTags(draft.selectedTags || []);
        setRemoveNames(draft.removeNames !== undefined ? draft.removeNames : true);
        setAnonymous(draft.anonymous || false);
        toast.success('Draft loaded');
      } catch (e) {
        toast.error("Couldn't load your draft. Starting fresh?");
      }
    }
  };

  const clearDraft = () => {
    const draftKey = 'community-draft';
    localStorage.removeItem(draftKey);
    setTitle('');
    setBody('');
    setSelectedTags([]);
    setRemoveNames(true);
    setAnonymous(false);
    setHasDraft(false);
    toast.success('Draft cleared');
  };

  const toggleTag = (tag: string) => {
    setSelectedTags(prev =>
      prev.includes(tag)
        ? prev.filter(t => t !== tag)
        : prev.length < 3 ? [...prev, tag] : prev
    );
  };

  const handlePost = async () => {
    if (!body.trim()) {
      toast.error('Your post needs some content. What would you like to share?');
      return;
    }

    if (selectedTags.length === 0) {
      toast.error('Pick at least one tag so others can find your post');
      return;
    }

    // Upload images first if any
    let imageUrls: string[] = [];
    if (images.length > 0) {
      imageUrls = await uploadImages();
    }

    onPost({
      title,
      body,
      tags: selectedTags,
      anonymous,
      removeNames,
      imageUrls: imageUrls.length > 0 ? imageUrls : undefined
    });

    // Clear images and draft after successful post
    images.forEach(img => URL.revokeObjectURL(img.url));
    setImages([]);
    localStorage.removeItem('community-draft');
    setHasDraft(false);
  };

  const charactersRemaining = CHARACTER_LIMIT - characterCount;
  const isOverLimit = characterCount > CHARACTER_LIMIT;
  const canPost = body.trim().length > 0 && selectedTags.length > 0 && !isOverLimit && !isUploading;

  return (
    <div className="max-w-2xl mx-auto space-y-3 sm:space-y-4 sm:space-y-6">
      <Card className="p-4 sm:p-5 md:p-6">
        <h2 className="text-lg sm:text-xl font-semibold text-[#132F43] mb-4">Share with the Community</h2>
        
        {/* Draft notification */}
        {hasDraft && (
          <div className="mb-4 p-3 bg-[#EEF4F8] border border-[#C8DDE8] rounded-lg flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Save className="w-4 h-4 text-blue-600" />
              <span className="text-sm text-blue-900">You have a saved draft</span>
            </div>
            <div className="flex gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={loadDraft}
                className="text-blue-600 hover:text-blue-700"
              >
                Load
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={clearDraft}
                className="text-blue-600 hover:text-blue-700"
              >
                Clear
              </Button>
            </div>
          </div>
        )}
        
        <div className="space-y-3 sm:space-y-4">
          {/* Title (optional) */}
          <div>
            <Label htmlFor="post-title" className="text-sm font-medium text-[#3A4A57] mb-2 block">
              Title (optional but encouraged for questions)
            </Label>
            <Input 
              id="post-title"
              placeholder="Give your post a clear title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              maxLength={100}
            />
          </div>

          {/* Post body */}
          <div>
            <Label htmlFor="post-body" className="text-sm font-medium text-[#3A4A57] mb-2 block">
              Your post
            </Label>
            <Textarea 
              id="post-body"
              placeholder="Ask about routines, sensory strategies, communication, school, or share a small win."
              value={body}
              onChange={(e) => setBody(e.target.value)}
              className="min-h-[120px] resize-vertical"
              maxLength={CHARACTER_LIMIT}
            />
            <div className="flex items-center justify-between mt-1">
              <p className="text-sm text-[#5A6B7A]">
                Add context: age, setting, what you tried
              </p>
              <p className={`text-sm font-medium ${
                isOverLimit ? 'text-red-600' : 
                charactersRemaining < 50 ? 'text-amber-600' : 
                'text-[#5A6B7A]'
              }`}>
                {charactersRemaining} characters remaining
              </p>
            </div>
          </div>

          {/* Tags */}
          <div>
            <Label className="text-sm font-medium text-[#3A4A57] mb-2 block">
              Tags (1-3 required)
            </Label>
            <div className="flex flex-wrap gap-2">
              {tags.map(tag => (
                <Button
                  key={tag}
                  variant={selectedTags.includes(tag) ? "default" : "outline"}
                  size="sm"
                  onClick={() => toggleTag(tag)}
                  disabled={selectedTags.length >= 3 && !selectedTags.includes(tag)}
                  className="transition-all"
                >
                  {tag}
                  {selectedTags.includes(tag) && (
                    <X className="w-3 h-3 ml-1" />
                  )}
                </Button>
              ))}
            </div>
            {selectedTags.length > 0 && (
              <p className="text-sm text-[#5A6B7A] mt-2">
                {selectedTags.length}/3 tags selected
              </p>
            )}
          </div>

          {/* PHI Toggle - ON by default as per spec */}
          <div className="p-4 bg-[#EEF4F8] border border-[#C8DDE8] rounded-lg">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <Label htmlFor="remove-names" className="text-sm font-medium text-blue-900 cursor-pointer">
                    Remove names/PHI
                  </Label>
                  <Badge variant="secondary" className="text-sm bg-blue-100 text-[#4A6478]">
                    Recommended
                  </Badge>
                </div>
                <p className="text-sm text-blue-700">
                  Automatically removes names and personal health information for privacy
                </p>
              </div>
              <Switch
                id="remove-names"
                checked={removeNames}
                onCheckedChange={setRemoveNames}
                className="ml-4"
              />
            </div>
          </div>

          {/* Additional options */}
          <div className="space-y-3 border-t border-[#E8E4DF] pt-4">
            <div className="flex items-center justify-between">
              <Label htmlFor="anonymous" className="text-sm cursor-pointer">
                Post anonymously
              </Label>
              <Switch
                id="anonymous"
                checked={anonymous}
                onCheckedChange={setAnonymous}
              />
            </div>

            <div className="flex items-center justify-between">
              <Label htmlFor="add-to-plan" className="text-sm cursor-pointer">
                Add to my Plan as a note
              </Label>
              <Switch
                id="add-to-plan"
                defaultChecked
              />
            </div>

            <div className="flex items-center justify-between">
              <Label htmlFor="expert-annotation" className="text-sm cursor-pointer">
                Allow expert annotation
              </Label>
              <Switch
                id="expert-annotation"
                defaultChecked
              />
            </div>
          </div>

          {/* Image Previews */}
          {images.length > 0 && (
            <div className="space-y-2">
              <Label className="text-sm font-medium text-[#3A4A57] block">
                Images ({images.length}/{MAX_IMAGES})
              </Label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {images.map((image) => (
                  <div
                    key={image.id}
                    className="relative aspect-square rounded-lg overflow-hidden border border-[#E8E4DF] bg-[#FAF7F2]"
                  >
                    <img
                      src={image.url}
                      alt="Preview"
                      className="w-full h-full object-cover"
                    />
                    {image.uploading && (
                      <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                        <Loader2 className="w-6 h-6 text-white animate-spin" />
                      </div>
                    )}
                    {!image.uploading && (
                      <button
                        type="button"
                        onClick={() => removeImage(image.id)}
                        className="absolute top-1 right-1 p-1 bg-black/60 rounded-full hover:bg-black/80 transition-colors"
                        aria-label="Remove image"
                      >
                        <X className="w-3 h-3 text-white" />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Action buttons */}
          <div className="flex items-center justify-between pt-4 border-t border-[#E8E4DF]">
            <div className="flex gap-2">
              <input
                ref={fileInputRef}
                type="file"
                accept={ALLOWED_TYPES.join(',')}
                multiple
                onChange={handleImageSelect}
                className="hidden"
                id="image-upload"
              />
              <Button
                variant="outline"
                size="sm"
                onClick={() => fileInputRef.current?.click()}
                disabled={images.length >= MAX_IMAGES || isUploading}
              >
                <ImagePlus className="w-4 h-4 mr-2" />
                {images.length > 0 ? 'Add more' : 'Add images'}
              </Button>
              {images.length > 0 && (
                <span className="text-sm text-[#5A6B7A] self-center">
                  {MAX_IMAGES - images.length} remaining
                </span>
              )}
            </div>

            <div className="flex gap-3">
              <Button variant="ghost" onClick={onCancel} disabled={isUploading}>
                Cancel
              </Button>
              <Button
                onClick={handlePost}
                disabled={!canPost}
              >
                {isUploading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Uploading...
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4 mr-2" />
                    Post
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>
      </Card>

      {/* Community Guidelines */}
      <Card className="p-4 bg-amber-50 border-amber-200">
        <div className="flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
          <div className="text-sm text-amber-900">
            <strong className="font-semibold">Community Guidelines:</strong> Be kind. No diagnoses. No treatments. Report concerns.
          </div>
        </div>
      </Card>
    </div>
  );
}

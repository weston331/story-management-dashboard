import React, { useState, useRef } from 'react';
import { UploadCloud, Loader2, Link2, CheckCircle2 } from 'lucide-react';
import { uploadImageToR2 } from '../services/r2';
import logger from '../services/logger';

interface R2ImageUploaderProps {
  value: string;
  onChange: (url: string) => void;
  lang: 'ar' | 'en';
  idPrefix?: string;
}

export default function R2ImageUploader({ value, onChange, lang, idPrefix = 'r2-upload' }: R2ImageUploaderProps) {
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleUpload = async (file: File) => {
    // 1.5MB limit check
    if (file.size > 1.5 * 1024 * 1024) {
      const limitMsg = lang === 'ar' 
        ? 'حجم الملف كبير جداً. الحد الأقصى هو 1.5 ميجابايت.' 
        : 'File size exceeds the 1.5MB limit.';
      setError(limitMsg);
      return;
    }

    // Only allow images
    if (!file.type.startsWith('image/')) {
      const typeMsg = lang === 'ar'
        ? 'عذراً، يرجى اختيار ملف صورة فقط.'
        : 'Please select an image file only.';
      setError(typeMsg);
      return;
    }

    setIsUploading(true);
    setError(null);

    try {
      const imageUrl = await uploadImageToR2(file);
      onChange(imageUrl);
      logger.info('File successfully uploaded & field updated:', { imageUrl });
    } catch (err: any) {
      logger.error('Failed uploading file:', err);
      const isConfigError = err.message?.includes('VITE_R2_UPLOAD_WORKER_URL');
      if (isConfigError) {
        setError(lang === 'ar'
          ? 'بوابة الرفع R2 غير مفعلة حالياً في ملف الإعدادات .env'
          : 'R2 Upload is not configured in .env'
        );
      } else {
        setError(err.message || (lang === 'ar' ? 'فشل رفع الملف. يرجى المحاولة لاحقاً.' : 'Upload failed. Please try again.'));
      }
    } finally {
      setIsUploading(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      handleUpload(e.target.files[0]);
    }
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleUpload(e.dataTransfer.files[0]);
    }
  };

  const triggerInputClick = () => {
    fileInputRef.current?.click();
  };

  return (
    <div className="space-y-2 text-start">
      {/* Visual File Upload Container */}
      <div
        onDragEnter={handleDrag}
        onDragOver={handleDrag}
        onDragLeave={handleDrag}
        onDrop={handleDrop}
        onClick={triggerInputClick}
        className={`border-2 border-dashed rounded-xl p-4 flex flex-col items-center justify-center gap-2 cursor-pointer transition-all ${
          dragActive 
            ? 'border-[#D4AF37] bg-[#D4AF37]/5 scale-[0.99]' 
            : 'border-white/10 hover:border-white/20 bg-white/[0.02] hover:bg-white/[0.04]'
        }`}
      >
        <input
          id={`${idPrefix}-file-input`}
          type="file"
          ref={fileInputRef}
          onChange={handleFileChange}
          accept="image/*"
          className="hidden"
          disabled={isUploading}
        />

        {isUploading ? (
          <div className="flex flex-col items-center gap-1.5 py-2">
            <Loader2 className="w-6 h-6 animate-spin text-[#D4AF37]" />
            <span className="text-xs text-stone-400 font-medium">
              {lang === 'ar' ? 'جاري رفع الملف إلى R2...' : 'Uploading to Cloudflare R2...'}
            </span>
          </div>
        ) : (
          <div className="flex flex-col items-center text-center gap-1">
            <UploadCloud className="w-6 h-6 text-stone-400 group-hover:text-[#D4AF37] transition-colors" />
            <p className="text-xs font-semibold text-stone-300">
              {lang === 'ar' ? 'اضغط للرفع أو اسحب الصورة هنا' : 'Click to upload or drag image here'}
            </p>
            <p className="text-[10px] text-stone-500">
              {lang === 'ar' ? 'الحد الأقصى للملف: 1.5 ميجابايت (PNG, JPG, WEBP)' : 'Max file size: 1.5MB (PNG, JPG, WEBP)'}
            </p>
          </div>
        )}
      </div>

      {/* Manual text input to inspect/manually override the URL if needed */}
      <div className="flex gap-2">
        <div className="relative flex-1">
          <div className="absolute inset-y-0 start-0 ps-3 flex items-center pointer-events-none text-stone-500 font-mono">
            <Link2 className="w-4 h-4" />
          </div>
          <input
            id={`${idPrefix}-url-input`}
            type="text"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder={lang === 'ar' ? 'رابط الصورة المرفوعة...' : 'Uploaded image URL...'}
            className="w-full bg-white/5 border border-white/10 rounded-lg ps-9 pe-4 py-2 text-stone-300 text-xs font-mono focus:outline-none focus:border-[#D4AF37]/60 transition-all text-start"
          />
        </div>
        {value && value.startsWith('http') && (
          <div className="flex items-center text-emerald-400 px-1" title={lang === 'ar' ? 'رابط الصورة صالح' : 'Valid image URL'}>
            <CheckCircle2 className="w-4 h-4" />
          </div>
        )}
      </div>

      {error && (
        <p className="text-[10.5px] text-red-400 font-medium leading-relaxed bg-red-950/20 border border-red-500/15 p-2 rounded-lg">
          {error}
        </p>
      )}
    </div>
  );
}

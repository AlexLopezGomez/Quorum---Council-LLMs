import { CheckCircle2, Image, MapPin } from 'lucide-react';

export default function ProfilePreview({ username }) {
  return (
    <div className="hidden md:flex flex-col items-center justify-center p-10 md:p-12 bg-surface-secondary relative">
      <div className="relative mb-5">
        <div className="bg-surface rounded-lg border border-surface-border shadow-sm px-4 py-3">
          <p className="text-xs text-text-secondary text-center leading-relaxed">
            Don't forget to add your profile image.<br />
            You can always do this later.
          </p>
        </div>
        <div className="absolute left-1/2 -translate-x-1/2 -bottom-1.5 w-3 h-3 bg-surface border-r border-b border-surface-border rotate-45" />
      </div>

      <div className="w-60 p-7 rounded-xl border border-surface-border bg-surface shadow-sm text-center">
        <div className="w-14 h-14 rounded-xl bg-surface-tertiary border border-surface-border mx-auto mb-4 flex items-center justify-center text-text-tertiary">
          <Image size={22} />
        </div>

        <div className="flex items-center justify-center gap-1.5 mb-1">
          <span className="text-sm font-semibold text-text-primary">{username || 'Your Name'}</span>
          <CheckCircle2 size={15} className="text-verdict-pass" />
        </div>
        <p className="text-xs text-text-secondary mb-3">@{username || 'marc_z'}</p>

        <div className="w-full h-[3px] rounded-full bg-surface-tertiary mb-1" />
        <div className="w-3/5 h-[3px] rounded-full bg-surface-tertiary mx-auto mb-4" />

        <div className="flex items-center justify-center gap-1.5 text-xs text-text-secondary">
          <MapPin size={13} />
          London, UK
        </div>
      </div>

      {/*<p className="absolute bottom-6 left-0 right-0 text-center text-xs text-text-tertiary leading-relaxed px-8">
        Your @username is how people will find and tag you on Quorum.<br />
        Make it short, memorable, and true to your brand.
      </p>*/}
    </div>
  );
}

"use client";

import { useState, useCallback, useRef } from "react";
import { fetcher, getAuthToken } from "@/lib/api-client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import {
  Image as ImageIcon, Video, Upload, Trash2, Copy, Check,
  X, Loader2, CloudUpload, ImagePlus, Search, FolderOpen,
} from "lucide-react";
import { toast } from "sonner";

interface MediaAsset {
  id: string;
  filename: string;
  public_url: string;
  file_type: "image" | "video";
  size_bytes: number;
  mime_type?: string;
  created_at: string;
}

interface MediaLibraryProps {
  /** If true, renders in picker mode — clicking an asset calls onSelect(url) */
  mode?: "manage" | "picker";
  onSelect?: (url: string, asset: MediaAsset) => void;
  /** Filter to only show images or videos */
  filterType?: "image" | "video" | "all";
}

export function MediaLibrary({ mode = "manage", onSelect, filterType = "all" }: MediaLibraryProps) {
  const [assets, setAssets] = useState<MediaAsset[]>([]);
  const [loading, setLoading] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState<"all" | "image" | "video">(filterType === "all" ? "all" : filterType);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const loadAssets = useCallback(async () => {
    setLoading(true);
    try {
      const typeParam = typeFilter !== "all" ? `&type=${typeFilter}` : "";
      const data = await fetcher(`/api/v1/media?page=1&limit=50${typeParam}`);
      setAssets(data.assets || []);
      setLoaded(true);
    } catch {
      toast.error("Failed to load media library");
    } finally {
      setLoading(false);
    }
  }, [typeFilter]);

  // Lazy load on first interaction
  const ensureLoaded = useCallback(() => {
    if (!loaded && !loading) loadAssets();
  }, [loaded, loading, loadAssets]);

  const handleFileUpload = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    const file = files[0];

    if (file.size > 10 * 1024 * 1024) {
      toast.error("File must be under 10 MB");
      return;
    }

    setUploading(true);
    try {
      // Convert to base64 for Vercel-compatible upload
      const reader = new FileReader();
      const base64Data = await new Promise<string>((resolve, reject) => {
        reader.onload = () => resolve((reader.result as string).split(",")[1]);
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });

      const token = await getAuthToken();
      const isProd = process.env.NODE_ENV === "production";
      const apiBase = isProd
        ? "https://ai-canvass.vercel.app/api/v1"
        : (process.env.NEXT_PUBLIC_API_URL?.replace("/automation", "") || "http://localhost:4000/api/v1");

      const res = await fetch(`${apiBase}/media/upload`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          filename: file.name,
          data: base64Data,
          mimeType: file.type,
        }),
      });

      if (!res.ok) throw new Error(await res.text());
      const newAsset = await res.json();

      setAssets(prev => [newAsset, ...prev]);
      toast.success(`"${file.name}" uploaded successfully`);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Upload failed";
      toast.error(msg);
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleDelete = async (asset: MediaAsset) => {
    setDeletingId(asset.id);
    try {
      await fetcher(`/api/v1/media/${asset.id}`, { method: "DELETE" });
      setAssets(prev => prev.filter(a => a.id !== asset.id));
      toast.success("Asset deleted");
    } catch {
      toast.error("Failed to delete asset");
    } finally {
      setDeletingId(null);
    }
  };

  const handleCopyUrl = (asset: MediaAsset) => {
    navigator.clipboard.writeText(asset.public_url);
    setCopiedId(asset.id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const formatSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const filtered = assets.filter(a => {
    if (typeFilter !== "all" && a.file_type !== typeFilter) return false;
    if (searchQuery) return a.filename.toLowerCase().includes(searchQuery.toLowerCase());
    return true;
  });

  return (
    <div className="flex flex-col h-full gap-4" onFocus={ensureLoaded}>
      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center">
        {/* Search */}
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
          <input
            type="text"
            placeholder="Search assets..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 h-9 text-sm border border-border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-primary/40"
          />
        </div>

        {/* Type filter */}
        <div className="flex gap-1">
          {(["all", "image", "video"] as const).map(t => (
            <Button
              key={t}
              size="sm"
              variant={typeFilter === t ? "default" : "outline"}
              onClick={() => { setTypeFilter(t); setLoaded(false); }}
              className="h-8 capitalize text-xs"
            >
              {t === "all" ? "All" : t === "image" ? <><ImageIcon className="h-3.5 w-3.5 mr-1" />Images</> : <><Video className="h-3.5 w-3.5 mr-1" />Videos</>}
            </Button>
          ))}
        </div>

        {/* Upload */}
        <Button
          size="sm"
          onClick={() => { ensureLoaded(); fileInputRef.current?.click(); }}
          disabled={uploading}
          className="h-8 gap-2"
        >
          {uploading ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <CloudUpload className="h-3.5 w-3.5" />
          )}
          {uploading ? "Uploading..." : "Upload"}
        </Button>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*,video/*"
          className="hidden"
          onChange={e => handleFileUpload(e.target.files)}
        />
      </div>

      {/* Load button (lazy) */}
      {!loaded && !loading && (
        <button
          onClick={loadAssets}
          className="flex flex-col items-center justify-center gap-3 border-2 border-dashed border-border rounded-xl py-12 text-muted-foreground hover:border-primary/30 hover:text-foreground transition-colors cursor-pointer"
        >
          <FolderOpen className="h-10 w-10 opacity-30" />
          <p className="text-sm font-medium">Click to load your media library</p>
          <p className="text-xs">Images and videos you upload will appear here</p>
        </button>
      )}

      {/* Loading state */}
      {loading && (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      )}

      {/* Empty state */}
      {loaded && !loading && filtered.length === 0 && (
        <div
          className="flex flex-col items-center justify-center gap-3 border-2 border-dashed border-border rounded-xl py-12 text-muted-foreground cursor-pointer hover:border-primary/30 transition-colors"
          onClick={() => fileInputRef.current?.click()}
        >
          <ImagePlus className="h-10 w-10 opacity-30" />
          <p className="text-sm font-medium">
            {searchQuery ? "No assets match your search" : "No media assets yet"}
          </p>
          <p className="text-xs">{searchQuery ? "Try a different search term" : "Click or drag & drop to upload images and videos"}</p>
        </div>
      )}

      {/* Asset Grid */}
      {loaded && !loading && filtered.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 overflow-y-auto">
          {filtered.map(asset => (
            <div
              key={asset.id}
              className={cn(
                "group relative border border-border rounded-xl overflow-hidden bg-secondary/10 transition-all duration-200",
                mode === "picker" && "cursor-pointer hover:border-primary hover:shadow-md hover:shadow-primary/10",
                mode === "manage" && "hover:border-border/80"
              )}
              onClick={() => mode === "picker" && onSelect?.(asset.public_url, asset)}
            >
              {/* Thumbnail */}
              <div className="aspect-square relative overflow-hidden bg-secondary/20">
                {asset.file_type === "image" ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={asset.public_url}
                    alt={asset.filename}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    loading="lazy"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <Video className="h-8 w-8 text-muted-foreground" />
                  </div>
                )}

                {/* Picker overlay */}
                {mode === "picker" && (
                  <div className="absolute inset-0 bg-primary/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                    <div className="bg-primary text-primary-foreground text-xs font-medium px-3 py-1.5 rounded-full">
                      Use this
                    </div>
                  </div>
                )}

                {/* File type badge */}
                <Badge
                  variant="secondary"
                  className="absolute top-1.5 left-1.5 text-[9px] h-4 px-1 opacity-80"
                >
                  {asset.file_type === "image" ? (
                    <ImageIcon className="h-2.5 w-2.5" />
                  ) : (
                    <Video className="h-2.5 w-2.5" />
                  )}
                </Badge>
              </div>

              {/* Info + actions */}
              <div className="p-2">
                <p className="text-xs font-medium truncate" title={asset.filename}>
                  {asset.filename}
                </p>
                <p className="text-[10px] text-muted-foreground">{formatSize(asset.size_bytes)}</p>

                {mode === "manage" && (
                  <div className="flex gap-1 mt-1.5">
                    <button
                      onClick={e => { e.stopPropagation(); handleCopyUrl(asset); }}
                      className="flex-1 flex items-center justify-center gap-1 text-[10px] py-1 rounded border border-border hover:bg-secondary/30 transition-colors"
                      title="Copy URL"
                    >
                      {copiedId === asset.id ? (
                        <><Check className="h-2.5 w-2.5 text-green-500" /> Copied</>
                      ) : (
                        <><Copy className="h-2.5 w-2.5" /> Copy URL</>
                      )}
                    </button>
                    <button
                      onClick={e => { e.stopPropagation(); handleDelete(asset); }}
                      className="flex items-center justify-center px-2 py-1 rounded border border-border hover:bg-destructive/10 hover:border-destructive/30 hover:text-destructive transition-colors"
                      disabled={deletingId === asset.id}
                      title="Delete"
                    >
                      {deletingId === asset.id ? (
                        <Loader2 className="h-2.5 w-2.5 animate-spin" />
                      ) : (
                        <Trash2 className="h-2.5 w-2.5" />
                      )}
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      <p className="text-[10px] text-muted-foreground text-center">
        {loaded ? `${filtered.length} asset${filtered.length !== 1 ? "s" : ""}` : ""}
        {" · "}Max 10 MB per file · Images & Videos supported
      </p>
    </div>
  );
}

// ─── Modal wrapper (for use inside content-approval panels) ──────────────────
interface MediaPickerModalProps {
  onSelect: (url: string, asset: MediaAsset) => void;
  filterType?: "image" | "video" | "all";
  trigger?: React.ReactNode;
}

export function MediaPickerModal({ onSelect, filterType = "all", trigger }: MediaPickerModalProps) {
  const [open, setOpen] = useState(false);

  const handleSelect = (url: string, asset: MediaAsset) => {
    onSelect(url, asset);
    setOpen(false);
  };

  if (!open) {
    return (
      <div onClick={() => setOpen(true)} className="cursor-pointer">
        {trigger || (
          <Button variant="outline" size="sm" className="gap-2">
            <ImagePlus className="h-3.5 w-3.5" />
            Media Library
          </Button>
        )}
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setOpen(false)} />
      <div className="relative z-10 bg-background border border-border rounded-2xl shadow-2xl w-full max-w-3xl max-h-[80vh] flex flex-col m-4">
        <div className="flex items-center justify-between p-4 border-b border-border">
          <div>
            <h2 className="font-semibold text-base">Media Library</h2>
            <p className="text-xs text-muted-foreground">Select an asset to attach to your post</p>
          </div>
          <Button variant="ghost" size="icon" onClick={() => setOpen(false)}>
            <X className="h-4 w-4" />
          </Button>
        </div>
        <div className="flex-1 overflow-y-auto p-4">
          <MediaLibrary mode="picker" onSelect={handleSelect} filterType={filterType} />
        </div>
      </div>
    </div>
  );
}

import { useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { PersonStanding, ArrowLeft, Play, Upload, X } from "lucide-react";
import { asset, modelUrl } from "../lib/assets";
import {
  storeVrm,
  getAllUploads,
  deleteVrm,
  type UploadedModel,
} from "../lib/vrmStore";

interface ModelEntry {
  name: string;
  file: string;
  cdn?: string;
  thumb?: string;
}

const UPLOAD_PREFIX = "upload:";

export function Gallery() {
  const navigate = useNavigate();
  const [models, setModels] = useState<ModelEntry[]>([]);
  const [uploads, setUploads] = useState<UploadedModel[]>([]);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    let cancelled = false;
    fetch(asset("models/index.json"))
      .then((r) => (r.ok ? r.json() : { models: [] }))
      .then((d: { models?: ModelEntry[] }) => {
        if (!cancelled && Array.isArray(d.models)) setModels(d.models);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    getAllUploads().then(setUploads).catch(() => {});
  }, []);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.name.toLowerCase().endsWith(".vrm")) return;

    // Save to IndexedDB in the background so it shows in the gallery later.
    storeVrm(file)
      .then((entry) => setUploads((prev) => [entry, ...prev]))
      .catch(() => {});

    // Navigate immediately — the Studio page will stream the file from a blob
    // URL and show real download progress.
    const blobUrl = URL.createObjectURL(file);
    navigate(`/studio/live?m=${encodeURIComponent(blobUrl)}`);

    if (fileRef.current) fileRef.current.value = "";
  };

  const handleDelete = async (id: string, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    try {
      await deleteVrm(id);
      setUploads((prev) => prev.filter((u) => u.id !== id));
    } catch {
      // silently fail
    }
  };

  const totalEmpty = models.length === 0 && uploads.length === 0;

  return (
    <div className="h-screen overflow-y-auto bg-bg bg-radial-gallery-hero">
      <nav className="sticky top-0 z-10 flex items-center justify-between gap-4 px-4 sm:px-8 lg:px-12 py-[0.9rem] bg-bg border-b border-border-line">
        <Link className="inline-flex items-center gap-[0.55rem] font-bold text-[0.95rem] tracking-[-0.01em] text-text no-underline" to="/">
          <span className="inline-flex items-center justify-center w-7 h-7 rounded-[9px] bg-accent text-accent-ink">
            <PersonStanding size={15} />
          </span>
          mocap-rs
        </Link>
        <Link className="inline-flex items-center gap-[0.4rem] text-muted no-underline text-[0.85rem] font-medium hover:text-text" to="/">
          <ArrowLeft size={16} /> Home
        </Link>
      </nav>

      <main className="max-w-5xl mx-auto px-4 sm:px-8 lg:px-12 pt-[clamp(2rem,7vh,4rem)] pb-16">
        <div className="mb-8">
          <h1 className="m-0 mb-2 text-[clamp(1.7rem,4.5vw,2.6rem)] font-extrabold tracking-[-0.03em]">Choose an avatar</h1>
          <p className="m-0 text-muted text-[0.95rem]">Pick a built-in avatar or upload your own VRM</p>
        </div>

        <div className="grid grid-cols-[repeat(auto-fill,minmax(13rem,1fr))] gap-[1.1rem]">
          {/* Upload card */}
          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ type: "spring", stiffness: 260, damping: 26 }}>
            <button
              className="group w-full block no-underline text-inherit bg-surface border border-dashed border-muted rounded overflow-hidden transition-[border-color,transform] duration-150 ease-out hover:border-accent hover:-translate-y-[3px] cursor-pointer"
              onClick={() => fileRef.current?.click()}
            >
              <div className="flex flex-col items-center justify-center gap-3 aspect-[4/3] bg-surface-2 text-muted group-hover:text-accent transition-colors">
                <Upload size={34} />
                <span className="text-[0.82rem] font-semibold">Upload VRM</span>
              </div>
            </button>
            <input
              ref={fileRef}
              type="file"
              accept=".vrm"
              className="hidden"
              onChange={handleUpload}
            />
          </motion.div>

          {/* Uploaded models */}
          {uploads.map((u, i) => (
            <motion.div
              key={u.id}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ type: "spring", stiffness: 260, damping: 26, delay: i * 0.05 }}
            >
              <div className="relative group/card">
                <button
                  className="absolute top-2 right-2 z-[2] p-1 rounded-full bg-surface-3/80 text-faint hover:text-bad hover:bg-surface-3 opacity-0 group-hover/card:opacity-100 transition-opacity cursor-pointer border-0"
                  onClick={(e) => handleDelete(u.id, e)}
                  title="Remove"
                >
                  <X size={14} />
                </button>
                <Link
                  className="group block no-underline text-inherit bg-surface border border-border-line rounded overflow-hidden transition-[border-color,transform] duration-150 ease-out hover:border-accent hover:-translate-y-[3px]"
                  to={`/studio/live?m=${encodeURIComponent(UPLOAD_PREFIX + u.id)}`}
                >
                  <div className="relative flex items-center justify-center aspect-[4/3] bg-radial-thumb text-accent">
                    <PersonStanding size={42} />
                    <span className="absolute bottom-[0.7rem] right-[0.7rem] inline-flex items-center justify-center w-[2.2rem] h-[2.2rem] rounded-full bg-accent text-accent-ink opacity-0 scale-[0.85] transition-[opacity,transform] duration-150 ease-out group-hover:opacity-100 group-hover:scale-100">
                      <Play size={18} />
                    </span>
                  </div>
                  <div className="flex items-center justify-between px-4 py-[0.85rem]">
                    <span className="font-semibold text-[0.92rem] truncate">{u.name}</span>
                    <span className="text-faint text-[0.82rem] group-hover:text-accent">Use →</span>
                  </div>
                </Link>
              </div>
            </motion.div>
          ))}

          {/* Built-in models */}
          {models.map((m, i) => (
            <motion.div
              key={m.file}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ type: "spring", stiffness: 260, damping: 26, delay: i * 0.05 }}
            >
              <Link className="group block no-underline text-inherit bg-surface border border-border-line rounded overflow-hidden transition-[border-color,transform] duration-150 ease-out hover:border-accent hover:-translate-y-[3px]" to={`/studio/live?m=${encodeURIComponent(modelUrl(m))}`}>
                <div className="relative flex items-center justify-center aspect-[4/3] bg-radial-thumb text-accent">
                  {m.thumb ? (
                    <img src={asset(`avatars/${m.thumb}`)} alt={m.name} loading="lazy" className="w-full h-full object-cover" />
                  ) : (
                    <PersonStanding size={42} />
                  )}
                  <span className="absolute bottom-[0.7rem] right-[0.7rem] inline-flex items-center justify-center w-[2.2rem] h-[2.2rem] rounded-full bg-accent text-accent-ink opacity-0 scale-[0.85] transition-[opacity,transform] duration-150 ease-out group-hover:opacity-100 group-hover:scale-100">
                    <Play size={18} />
                  </span>
                </div>
                <div className="flex items-center justify-between px-4 py-[0.85rem]">
                  <span className="font-semibold text-[0.92rem]">{m.name}</span>
                  <span className="text-faint text-[0.82rem] group-hover:text-accent">Use →</span>
                </div>
              </Link>
            </motion.div>
          ))}

          {totalEmpty && (
            <div className="text-faint text-[0.9rem]">No avatars found in models/index.json.</div>
          )}
        </div>
      </main>
    </div>
  );
}

import { useEffect, useState } from "react";
import { apiGetBlob } from "@/lib/api";

interface AuthImageProps {
  /** Caminho do arquivo protegido, começando com /check-photos/... (sem o /api/v1). */
  path: string;
  alt?: string;
  className?: string;
  onClick?: () => void;
}

/**
 * Exibe uma imagem servida por um endpoint que exige autenticação (header),
 * buscando como blob e criando um object URL (um <img src> direto daria 401).
 */
export function AuthImage({ path, alt = "", className, onClick }: AuthImageProps) {
  const [src, setSrc] = useState<string | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    let active = true;
    let objectUrl: string | null = null;
    setError(false);
    setSrc(null);
    apiGetBlob(path)
      .then((blob) => {
        if (!active) return;
        objectUrl = URL.createObjectURL(blob);
        setSrc(objectUrl);
      })
      .catch(() => {
        if (active) setError(true);
      });
    return () => {
      active = false;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [path]);

  if (error) {
    return (
      <div className={className} style={{ display: "grid", placeItems: "center", background: "#f1f5f9", color: "#94a3b8", fontSize: 11 }}>
        sem imagem
      </div>
    );
  }
  if (!src) {
    return <div className={className} style={{ background: "#e2e8f0" }} aria-busy="true" />;
  }
  return <img src={src} alt={alt} className={className} onClick={onClick} loading="lazy" />;
}

export default AuthImage;

/**
 * Extrai ícone de app da Apple App Store usando a API oficial do iTunes Lookup.
 * Funciona com links como:
 *   - https://apps.apple.com/br/app/nubank/id814456780
 *   - https://apps.apple.com/app/id814456780
 */
export async function extractAppStoreIcon(url: string): Promise<string | null> {
  try {
    // Extrair o ID numérico do app da URL
    const idMatch = url.match(/id(\d+)/);
    if (!idMatch) return null;

    const appId = idMatch[1];
    // API oficial da Apple - retorna JSON com dados do app incluindo ícone HD
    const response = await fetch(`https://itunes.apple.com/lookup?id=${appId}`);
    const data = await response.json();

    if (data.results && data.results.length > 0) {
      // artworkUrl512 é a maior, mas nem sempre existe. artworkUrl100 sempre existe.
      let iconUrl = data.results[0].artworkUrl512 || data.results[0].artworkUrl100;
      // Forçar resolução 192x192 trocando no URL (mais leve para base64)
      if (iconUrl) {
        iconUrl = iconUrl.replace(/\d+x\d+/, '192x192');
      }
      return iconUrl || null;
    }
    return null;
  } catch (e) {
    console.error('Erro App Store:', e);
    return null;
  }
}

/**
 * Extrai ícone de app da Google Play Store.
 * Funciona com links como:
 *   - https://play.google.com/store/apps/details?id=com.nu.production
 * 
 * Usa proxy CORS + scraping da meta og:image
 */
export async function extractPlayStoreIcon(url: string): Promise<string | null> {
  try {
    const proxyUrl = `https://api.allorigins.win/get?url=${encodeURIComponent(url)}`;
    const response = await fetch(proxyUrl);
    const data = await response.json();

    if (!data.contents) return null;

    // Buscar og:image no HTML retornado
    const ogMatch = data.contents.match(/<meta\s+property=["']og:image["']\s+content=["']([^"']+)["']/i);
    if (ogMatch && ogMatch[1]) {
      return ogMatch[1];
    }

    // Fallback: buscar qualquer imagem com play-lh.googleusercontent.com
    const imgMatch = data.contents.match(/https:\/\/play-lh\.googleusercontent\.com\/[^\s"'<>]+/);
    if (imgMatch) {
      return imgMatch[0];
    }

    return null;
  } catch (e) {
    console.error('Erro Play Store:', e);
    return null;
  }
}

/**
 * Extrai favicon de qualquer site usando a API do Google Favicons (128px).
 */
export function getSiteFavicon(domain: string): string {
  return `https://www.google.com/s2/favicons?domain=${domain}&sz=128`;
}

/**
 * Converte qualquer URL de imagem para Base64 via proxy CORS.
 * Imagens em Base64 funcionam em notificações PWA em TODOS os dispositivos.
 */
export async function urlToBase64(url: string): Promise<string> {
  try {
    // Se já é base64, retorna direto
    if (url.startsWith('data:')) return url;

    const proxyUrl = `https://api.allorigins.win/raw?url=${encodeURIComponent(url)}`;
    const response = await fetch(proxyUrl);
    const blob = await response.blob();

    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  } catch (e) {
    console.error('Erro ao converter para base64:', e);
    return url; // fallback
  }
}

/**
 * Detecta automaticamente se é App Store, Play Store ou site genérico e extrai o ícone.
 */
export async function smartExtractIcon(input: string): Promise<{ base64: string; source: string } | null> {
  let rawUrl: string | null = null;
  let source = '';

  const normalized = input.trim();

  if (normalized.includes('apps.apple.com') || normalized.includes('itunes.apple.com')) {
    source = 'App Store';
    rawUrl = await extractAppStoreIcon(normalized);
  } else if (normalized.includes('play.google.com')) {
    source = 'Play Store';
    rawUrl = await extractPlayStoreIcon(normalized);
  } else {
    // Trata como site genérico
    source = 'Site';
    try {
      const urlObj = new URL(normalized.startsWith('http') ? normalized : `https://${normalized}`);
      rawUrl = getSiteFavicon(urlObj.hostname);
    } catch {
      return null;
    }
  }

  if (!rawUrl) return null;

  const base64 = await urlToBase64(rawUrl);
  return { base64, source };
}

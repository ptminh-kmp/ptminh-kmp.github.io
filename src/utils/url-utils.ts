import I18nKey from "@i18n/i18nKey";
import { i18n } from "@i18n/translation";

export function pathsEqual(path1: string, path2: string) {
	const normalizedPath1 = path1.replace(/^\/|\/$/g, "").toLowerCase();
	const normalizedPath2 = path2.replace(/^\/|\/$/g, "").toLowerCase();
	return normalizedPath1 === normalizedPath2;
}

function joinUrl(...parts: string[]): string {
	const joined = parts.join("/");
	return joined.replace(/\/+/g, "/");
}

export function getPostUrlBySlug(slug: string, langOverride?: string): string {
	return url(`/posts/${slug}/`, langOverride);
}

export function getTagUrl(tag: string, langOverride?: string): string {
	if (!tag) return url("/archive/", langOverride);
	return url(`/archive/?tag=${encodeURIComponent(tag.trim())}`, langOverride);
}

export function getCategoryUrl(category: string | null, langOverride?: string): string {
	if (
		!category ||
		category.trim() === "" ||
		category.trim().toLowerCase() === i18n(I18nKey.uncategorized).toLowerCase()
	)
		return url("/archive/?uncategorized=true", langOverride);
	return url(`/archive/?category=${encodeURIComponent(category.trim())}`, langOverride);
}

export function getDir(path: string): string {
	const lastSlashIndex = path.lastIndexOf("/");
	if (lastSlashIndex < 0) {
		return "/";
	}
	return path.substring(0, lastSlashIndex + 1);
}

export function url(path: string, langOverride?: string) {
    let lang = 'vi';
    if (typeof window !== "undefined") {
        lang = window.location.pathname.indexOf("/en/") === 0 ? "en" : "vi";
    }
    if (langOverride) lang = langOverride;
	return joinUrl("", import.meta.env.BASE_URL, lang, path);
}

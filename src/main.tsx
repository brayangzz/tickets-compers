import React from "react";
import ReactDOM from "react-dom/client";
import { RouterProvider } from "react-router-dom";
import materialSymbolsRoundedWoff2Url from "@fontsource/material-symbols-rounded/files/material-symbols-rounded-latin-400-normal.woff2?url";
import { API_BASE_URL, LEGACY_API_BASE_URL } from "./config/api";
import { router } from "./router";
import "./index.css";
import {
  SessionExpiredModal,
  triggerSessionExpired,
} from "./components/modals/SessionExpiredModal";
import { getStoredToken } from "./utils/auth";

const originalFetch = window.fetch;
let hasTriggeredSessionExpired = false;
const isLocalhost =
  window.location.hostname === "localhost" ||
  window.location.hostname === "127.0.0.1";
const runtimeApiBaseUrl = isLocalhost ? API_BASE_URL : "/api";
const ICON_SELECTOR = ".material-symbols-rounded";
const MATERIAL_SYMBOLS_FAMILY = "Material Symbols Rounded";
const MATERIAL_SYMBOLS_PENDING_CLASS = "ms-icons-pending";
const MATERIAL_SYMBOLS_FONT_DESCRIPTOR = `24px "${MATERIAL_SYMBOLS_FAMILY}"`;
const MATERIAL_SYMBOLS_PROBE_TOKEN = "arrow_forward";

const preloadMaterialSymbols = () => {
  const existingPreload = document.querySelector('link[data-ms-font-preload="true"]');
  if (existingPreload) return;

  const link = document.createElement("link");
  link.rel = "preload";
  link.as = "font";
  link.type = "font/woff2";
  link.crossOrigin = "anonymous";
  link.href = materialSymbolsRoundedWoff2Url;
  link.dataset.msFontPreload = "true";
  document.head.appendChild(link);
};

const markMaterialSymbolsReady = () => {
  const root = document.documentElement;
  const setPending = (pending: boolean) => {
    root.classList.toggle(MATERIAL_SYMBOLS_PENDING_CLASS, pending);
  };

  if (!("fonts" in document)) {
    setPending(false);
    return;
  }

  const fontSet = document.fonts;
  const normalizeFamily = (family: string) => family.replace(/['"]/g, "").trim();
  const isMaterialFace = (face: FontFace) => normalizeFamily(face.family) === MATERIAL_SYMBOLS_FAMILY;
  const isFontReady = () =>
    fontSet.check(MATERIAL_SYMBOLS_FONT_DESCRIPTOR, MATERIAL_SYMBOLS_PROBE_TOKEN);
  const syncPendingState = () => setPending(!isFontReady());
  const isMaterialEvent = (event: Event) =>
    "fontfaces" in event &&
    Array.isArray((event as FontFaceSetLoadEvent).fontfaces) &&
    (event as FontFaceSetLoadEvent).fontfaces.some(isMaterialFace);

  const handleLoading = (event: Event) => {
    if (isMaterialEvent(event)) {
      setPending(true);
    }
  };

  const handleLoadingDone = (event: Event) => {
    if (!isMaterialEvent(event)) return;
    syncPendingState();
  };

  fontSet.addEventListener("loading", handleLoading);
  fontSet.addEventListener("loadingdone", handleLoadingDone);
  fontSet.addEventListener("loadingerror", handleLoadingDone);

  fontSet
    .load(MATERIAL_SYMBOLS_FONT_DESCRIPTOR, MATERIAL_SYMBOLS_PROBE_TOKEN)
    .then(syncPendingState)
    .catch(() => {});
  syncPendingState();
};

const markAsNoTranslate = (element: Element | null) => {
  if (!element) return;
  if (element.getAttribute("translate") !== "no") {
    element.setAttribute("translate", "no");
  }
  if (!element.classList.contains("notranslate")) {
    element.classList.add("notranslate");
  }
};

const protectFromAutoTranslate = () => {
  markAsNoTranslate(document.documentElement);
  markAsNoTranslate(document.body);
  markAsNoTranslate(document.getElementById("root"));

  const normalizeText = (value: string | null | undefined) =>
    (value ?? "").replace(/\s+/g, " ").trim();

  const isMaterialIconToken = (value: string) => /^[a-z0-9_]+$/i.test(value);

  const rememberIconToken = (icon: Element) => {
    if (!(icon instanceof HTMLElement)) return;
    const currentText = normalizeText(icon.textContent);
    const savedToken = normalizeText(icon.dataset.iconToken);

    if (!savedToken && isMaterialIconToken(currentText)) {
      icon.dataset.iconToken = currentText;
    }
  };

  const restoreIconToken = (icon: Element) => {
    if (!(icon instanceof HTMLElement)) return;
    const savedToken = normalizeText(icon.dataset.iconToken);
    if (!savedToken) return;

    const currentText = normalizeText(icon.textContent);
    if (currentText !== savedToken) {
      icon.textContent = savedToken;
    }
  };

  const protectIcon = (icon: Element) => {
    markAsNoTranslate(icon);
    rememberIconToken(icon);
    restoreIconToken(icon);
  };

  const protectIcons = (scope: ParentNode) => {
    if (scope instanceof Element && scope.matches(ICON_SELECTOR)) {
      protectIcon(scope);
    }

    if ("querySelectorAll" in scope) {
      scope.querySelectorAll(ICON_SELECTOR).forEach((icon) => {
        protectIcon(icon);
      });
    }
  };

  protectIcons(document);

  const observer = new MutationObserver((mutations) => {
    mutations.forEach((mutation) => {
      if (mutation.type === "childList") {
        mutation.addedNodes.forEach((node) => {
          if (node instanceof Element) {
            protectIcons(node);
          }
        });

        if (mutation.target instanceof Element) {
          const iconContainer = mutation.target.closest(ICON_SELECTOR);
          if (iconContainer) {
            if (iconContainer instanceof HTMLElement && !normalizeText(iconContainer.dataset.iconToken)) {
              mutation.removedNodes.forEach((removedNode) => {
                const removedText = normalizeText(removedNode.textContent);
                if (!normalizeText(iconContainer.dataset.iconToken) && isMaterialIconToken(removedText)) {
                  iconContainer.dataset.iconToken = removedText;
                }
              });
            }
            protectIcon(iconContainer);
          }
        }
      }

      if (mutation.type === "characterData") {
        const parentIcon = mutation.target.parentElement?.closest(ICON_SELECTOR);
        if (parentIcon) {
          if (parentIcon instanceof HTMLElement && !normalizeText(parentIcon.dataset.iconToken)) {
            const previousText = normalizeText(mutation.oldValue);
            if (isMaterialIconToken(previousText)) {
              parentIcon.dataset.iconToken = previousText;
            }
          }
          protectIcon(parentIcon);
        }
      }

      if (mutation.type === "attributes" && mutation.target instanceof Element) {
        if (
          mutation.target === document.documentElement ||
          mutation.target === document.body ||
          mutation.target.id === "root"
        ) {
          markAsNoTranslate(mutation.target);
        }
      }
    });
  });

  observer.observe(document.body, {
    childList: true,
    subtree: true,
    characterData: true,
    characterDataOldValue: true,
  });

  observer.observe(document.documentElement, {
    attributes: true,
    attributeFilter: ["class", "translate"],
  });
};

const getRequestUrl = (input: RequestInfo | URL) => {
  if (typeof input === "string") return input;
  if (input instanceof URL) return input.href;
  return input.url;
};

const rewriteLegacyApiBase = (url: string) => {
  if (!url.startsWith(LEGACY_API_BASE_URL)) return url;
  if (runtimeApiBaseUrl === LEGACY_API_BASE_URL) return url;
  return `${runtimeApiBaseUrl}${url.slice(LEGACY_API_BASE_URL.length)}`;
};

const rewriteRequestInput = (input: RequestInfo | URL, rewrittenUrl: string) => {
  if (typeof input === "string") return rewrittenUrl;
  if (input instanceof URL) return new URL(rewrittenUrl);
  if (input instanceof Request && rewrittenUrl !== input.url) {
    return new Request(rewrittenUrl, input);
  }
  return input;
};

protectFromAutoTranslate();
preloadMaterialSymbols();
markMaterialSymbolsReady();

window.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
  const originalUrl = getRequestUrl(input);
  const rewrittenUrl = rewriteLegacyApiBase(originalUrl);
  const rewrittenInput = rewriteRequestInput(input, rewrittenUrl);
  const response = await originalFetch(rewrittenInput, init);

  if (
    (response.status === 401 || response.status === 403) &&
    Boolean(getStoredToken()) &&
    !rewrittenUrl.includes("/login") &&
    window.location.pathname !== "/login" &&
    !hasTriggeredSessionExpired
  ) {
    hasTriggeredSessionExpired = true;
    triggerSessionExpired();
  }

  return response;
};

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <>
      <RouterProvider router={router} />
      <SessionExpiredModal />
    </>
  </React.StrictMode>,
);

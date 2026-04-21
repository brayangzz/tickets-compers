import React from "react";
import ReactDOM from "react-dom/client";
import { RouterProvider } from "react-router-dom";
import "@fontsource/material-symbols-rounded/400.css";
import { API_BASE_URL, LEGACY_API_BASE_URL } from "./config/api";
import { router } from "./router";
import "./index.css";
import {
  SessionExpiredModal,
  triggerSessionExpired,
} from "./components/modals/SessionExpiredModal";

const originalFetch = window.fetch;
let hasTriggeredSessionExpired = false;
const isLocalhost =
  window.location.hostname === "localhost" ||
  window.location.hostname === "127.0.0.1";
const runtimeApiBaseUrl = isLocalhost ? API_BASE_URL : "/api";
const ICON_SELECTOR = ".material-symbols-rounded";
const MATERIAL_SYMBOLS_PENDING_CLASS = "ms-icons-pending";

const markMaterialSymbolsReady = () => {
  const root = document.documentElement;
  const clearPending = () => root.classList.remove(MATERIAL_SYMBOLS_PENDING_CLASS);

  if (!("fonts" in document)) {
    clearPending();
    return;
  }

  if (document.fonts.check('24px "Material Symbols Rounded"')) {
    clearPending();
    return;
  }

  const timeoutId = window.setTimeout(() => {
    clearPending();
  }, 6000);

  const onFontReady = () => {
    window.clearTimeout(timeoutId);
    clearPending();
  };

  document.fonts
    .load('24px "Material Symbols Rounded"')
    .then(onFontReady)
    .catch(() => {});

  document.fonts.ready
    .then(() => {
      if (document.fonts.check('24px "Material Symbols Rounded"')) {
        onFontReady();
      }
    })
    .catch(() => {});
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
markMaterialSymbolsReady();

window.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
  const originalUrl = getRequestUrl(input);
  const rewrittenUrl = rewriteLegacyApiBase(originalUrl);
  const rewrittenInput = rewriteRequestInput(input, rewrittenUrl);
  const response = await originalFetch(rewrittenInput, init);

  if (
    response.status === 401 &&
    !rewrittenUrl.includes("/login") &&
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

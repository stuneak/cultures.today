import { isMantineColorScheme, MantineColorSchemeManager } from "@mantine/core";

const key = "cultures-color-scheme";

export function localStorageColorSchemeManager(): MantineColorSchemeManager {
  let handleStorageEvent: ((event: StorageEvent) => void) | undefined;

  return {
    get: (defaultValue) => {
      if (typeof window === "undefined") {
        return defaultValue;
      }

      try {
        const value = window.localStorage.getItem(key);
        return value && isMantineColorScheme(value) ? value : defaultValue;
      } catch {
        return defaultValue;
      }
    },

    set: (value) => {
      try {
        window.localStorage.setItem(key, value);
      } catch (error) {
        console.warn(
          "[@mantine/core] Local storage color scheme manager was unable to save color scheme.",
          error
        );
      }
    },

    subscribe: (onUpdate) => {
      handleStorageEvent = (event) => {
        if (event.storageArea === window.localStorage && event.key === key) {
          if (isMantineColorScheme(event.newValue)) {
            onUpdate(event.newValue);
          }
        }
      };

      window.addEventListener("storage", handleStorageEvent);
    },

    unsubscribe: () => {
      if (handleStorageEvent) {
        window.removeEventListener("storage", handleStorageEvent);
      }
    },

    clear: () => {
      window.localStorage.removeItem(key);
    },
  };
}

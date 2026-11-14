import type { Species } from "@/lib/types";

/**
 * Landing photography: openly licensed photos from Wikimedia Commons, self-hosted in /public/images
 * (resized and compressed; otherwise unchanged). Credits are shown on the page.
 */
export type Photo = { src: string; width: number; height: number; alt: string; author: string; licence: string; licenceUrl: string; source: string };

export const PHOTOS: Record<Exclude<Species, "other">, Photo> = {
  dog: {
    src: "/images/dog-labrador.jpg",
    width: 1410,
    height: 919,
    alt: "A yellow Labrador standing on a grassy hillside",
    author: "IDS.photos from Tiverton, UK",
    licence: "CC BY-SA 2.0",
    licenceUrl: "https://creativecommons.org/licenses/by-sa/2.0/",
    source: "https://commons.wikimedia.org/wiki/File:Labrador_on_Quantock_(2175262184).jpg",
  },
  cat: {
    src: "/images/cat-tabby.jpg",
    width: 1048,
    height: 1400,
    alt: "A tabby cat sitting on a wall against a winter sky",
    author: "Alvesgaspar",
    licence: "CC BY-SA 3.0",
    licenceUrl: "https://creativecommons.org/licenses/by-sa/3.0/",
    source: "https://commons.wikimedia.org/wiki/File:Cat_November_2010-1a.jpg",
  },
  rabbit: {
    src: "/images/rabbit.jpg",
    width: 1400,
    height: 1050,
    alt: "A white and ginger rabbit looking at the camera",
    author: "Grace Castellano",
    licence: "Public domain",
    licenceUrl: "https://creativecommons.org/publicdomain/mark/1.0/",
    source: "https://commons.wikimedia.org/wiki/File:Butterscotch.JPG",
  },
  horse: {
    src: "/images/horse-ponies.jpg",
    width: 1200,
    height: 900,
    alt: "Two grey ponies grazing in a green meadow",
    author: "Lesbardd",
    licence: "CC BY-SA 4.0",
    licenceUrl: "https://creativecommons.org/licenses/by-sa/4.0/",
    source: "https://commons.wikimedia.org/wiki/File:RSPBConwy03LB.jpg",
  },
};

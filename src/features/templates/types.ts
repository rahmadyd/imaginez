export type Slot = {
  x: number; // pojok kiri-atas sebelum rotasi, dalam piksel canvas template
  y: number;
  w: number;
  h: number;
  rotate: number; // derajat, 0 default, searah jarum jam
};

export type Template = {
  id: string;
  name: string;
  canvas: {
    w: number;
    h: number;
  };
  slots: Slot[]; // urutan array = urutan pengambilan foto
  overlayKey: string; // kunci objek overlay
  background: string; // warna hex di belakang foto, default "#ffffff"
  published: boolean;
  sort: number;
};

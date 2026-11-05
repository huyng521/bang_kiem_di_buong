// Nén ảnh ngay trên thiết bị trước khi tải lên: cạnh dài tối đa 1600px, dung lượng < ~500KB.
const CANH_DAI_TOI_DA = 1600;
const DUNG_LUONG_TOI_DA = 500 * 1024;

export async function nenAnh(file: File): Promise<Blob> {
  const bitmap = await createImageBitmap(file, { imageOrientation: "from-image" } as ImageBitmapOptions);
  let { width, height } = bitmap;
  const tiLe = Math.min(1, CANH_DAI_TOI_DA / Math.max(width, height));
  width = Math.round(width * tiLe);
  height = Math.round(height * tiLe);
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  canvas.getContext("2d")!.drawImage(bitmap, 0, 0, width, height);
  bitmap.close?.();

  let chatLuong = 0.82;
  let blob = await toBlob(canvas, chatLuong);
  while (blob.size > DUNG_LUONG_TOI_DA && chatLuong > 0.4) {
    chatLuong -= 0.1;
    blob = await toBlob(canvas, chatLuong);
  }
  return blob;
}

function toBlob(canvas: HTMLCanvasElement, q: number): Promise<Blob> {
  return new Promise((ok, loi) => canvas.toBlob((b) => (b ? ok(b) : loi(new Error("Không nén được ảnh"))), "image/jpeg", q));
}

/** Tải blob lên Supabase Storage bằng phiên đăng nhập của người dùng, có báo tiến trình. */
export function taiLenStorage(opts: {
  bucket: string;
  path: string;
  blob: Blob;
  accessToken: string;
  onTienTrinh: (phanTram: number) => void;
}): Promise<void> {
  return new Promise((ok, loi) => {
    const xhr = new XMLHttpRequest();
    const url = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/${opts.bucket}/${opts.path}`;
    xhr.open("POST", url);
    xhr.setRequestHeader("Authorization", `Bearer ${opts.accessToken}`);
    xhr.setRequestHeader("apikey", process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!);
    xhr.setRequestHeader("Content-Type", "image/jpeg");
    xhr.setRequestHeader("x-upsert", "false");
    xhr.upload.onprogress = (e) => e.lengthComputable && opts.onTienTrinh(Math.round((e.loaded / e.total) * 100));
    xhr.onload = () => (xhr.status < 300 ? ok() : loi(new Error(`Tải lên lỗi (${xhr.status})`)));
    xhr.onerror = () => loi(new Error("Mất kết nối khi tải ảnh"));
    xhr.send(opts.blob);
  });
}

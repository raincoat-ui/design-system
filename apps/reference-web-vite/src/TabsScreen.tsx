import { Tabs, TabsContent, TabsList, TabsTrigger } from "@raincoat-ui/react";
import { type ReactNode, useState } from "react";

/** More tabs than fit a phone, in a translation longer than the English: Vietnamese. */
export const TRANSLATED = [
  "Tổng quan",
  "Thông số kỹ thuật",
  "Đánh giá",
  "Câu hỏi thường gặp",
  "Vận chuyển",
  "Đổi trả",
];

/** A plain shape that stands for an icon, drawn for this app. It is decoration. */
function ShapeIcon({ shape }: { shape: "circle" | "square" | "triangle" }) {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" fill="currentColor">
      {shape === "circle" && <circle cx="12" cy="12" r="8" />}
      {shape === "square" && <rect x="4" y="4" width="16" height="16" rx="2" />}
      {shape === "triangle" && <path d="M12 4l8 16H4z" />}
    </svg>
  );
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section>
      <h2>{title}</h2>
      {children}
    </section>
  );
}

/**
 * The Tabs in the states of their spec (specs/components/tabs/spec.yaml), at /tabs. The selected
 * tab of the first row is written in the line at the top, which is how the tests see the
 * selection change.
 */
export function TabsScreen() {
  const [product, setProduct] = useState("details");

  return (
    <main>
      <h1>Tabs</h1>
      <p aria-live="polite" data-testid="selected">
        Selected: {product}
      </p>

      <Section title="Labels">
        <Tabs value={product} onValueChange={setProduct}>
          <TabsList aria-label="Product">
            <TabsTrigger value="details">Details</TabsTrigger>
            <TabsTrigger value="reviews">Reviews</TabsTrigger>
            <TabsTrigger value="shipping">Shipping</TabsTrigger>
          </TabsList>
          <TabsContent value="details" className="panel">
            Made of waxed cotton, with taped seams.
          </TabsContent>
          <TabsContent value="reviews" className="panel">
            Rated 4 of 5 by 120 buyers. <a href="#reviews">Read the reviews</a>
          </TabsContent>
          <TabsContent value="shipping" className="panel">
            Ships in two days.
          </TabsContent>
        </Tabs>
      </Section>

      <Section title="Icons">
        <Tabs defaultValue="photos">
          <TabsList aria-label="Media">
            <TabsTrigger value="photos" leadingIcon={<ShapeIcon shape="circle" />}>
              Photos
            </TabsTrigger>
            <TabsTrigger value="videos" leadingIcon={<ShapeIcon shape="square" />}>
              Videos
            </TabsTrigger>
            <TabsTrigger value="files" leadingIcon={<ShapeIcon shape="triangle" />}>
              Files
            </TabsTrigger>
          </TabsList>
          <TabsContent value="photos" className="panel">
            No photos yet.
          </TabsContent>
          <TabsContent value="videos" className="panel">
            No videos yet.
          </TabsContent>
          <TabsContent value="files" className="panel">
            No files yet.
          </TabsContent>
        </Tabs>
      </Section>

      <Section title="Icon only">
        <Tabs defaultValue="list">
          <TabsList aria-label="Layout">
            <TabsTrigger
              value="list"
              aria-label="List"
              leadingIcon={<ShapeIcon shape="square" />}
            />
            <TabsTrigger
              value="grid"
              aria-label="Grid"
              leadingIcon={<ShapeIcon shape="circle" />}
            />
          </TabsList>
          <TabsContent value="list" className="panel">
            Shown as a list.
          </TabsContent>
          <TabsContent value="grid" className="panel">
            Shown as a grid.
          </TabsContent>
        </Tabs>
      </Section>

      {/* Narrower than its tabs on every screen, so it always scrolls. */}
      <Section title="Overflowing, translated">
        <div className="narrow" lang="vi">
          <Tabs defaultValue="0">
            <TabsList aria-label="Sản phẩm" data-testid="translated">
              {TRANSLATED.map((label, index) => (
                <TabsTrigger key={label} value={String(index)}>
                  {label}
                </TabsTrigger>
              ))}
            </TabsList>
            {TRANSLATED.map((label, index) => (
              <TabsContent key={label} value={String(index)} className="panel">
                {`Đang xem: ${label}`}
              </TabsContent>
            ))}
          </Tabs>
        </div>
      </Section>

      <Section title="Right to left">
        <div dir="rtl" lang="ar">
          <Tabs defaultValue="details">
            <TabsList aria-label="المنتج">
              <TabsTrigger value="details">التفاصيل</TabsTrigger>
              <TabsTrigger value="reviews">المراجعات</TabsTrigger>
              <TabsTrigger value="shipping">الشحن</TabsTrigger>
            </TabsList>
            <TabsContent value="details" className="panel">
              مصنوع من القطن المشمّع.
            </TabsContent>
            <TabsContent value="reviews" className="panel">
              التقييم 4 من 5.
            </TabsContent>
            <TabsContent value="shipping" className="panel">
              يُشحن خلال يومين.
            </TabsContent>
          </Tabs>
        </div>
      </Section>

      <Section title="Manual activation, and a kept panel">
        <Tabs defaultValue="form" activationMode="manual">
          <TabsList aria-label="Order">
            <TabsTrigger value="form">Note</TabsTrigger>
            <TabsTrigger value="history">History</TabsTrigger>
          </TabsList>
          <TabsContent value="form" keepMounted className="panel">
            <label>
              Note for the courier <input name="note" />
            </label>
          </TabsContent>
          <TabsContent value="history" className="panel">
            No orders yet.
          </TabsContent>
        </Tabs>
      </Section>
    </main>
  );
}

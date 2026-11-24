// The Tabs, at /tabs, rendered by a Server Component. Tabs are Client Components: the server
// renders their HTML, with only the selected tab's panel, and React then hydrates them. What this
// page passes them is text and markup, which a Server Component may pass.
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@raincoat-ui/react";
import { Section } from "../ui";

const PANEL = "py-(--rc-space-4)";

/** More tabs than fit a phone, in a translation longer than the English: Vietnamese. */
const TRANSLATED = [
  "Tổng quan",
  "Thông số kỹ thuật",
  "Đánh giá",
  "Câu hỏi thường gặp",
  "Vận chuyển",
  "Đổi trả",
];

/** A plain shape that stands for an icon, drawn for this app. It is decoration. */
function Dot() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" fill="currentColor">
      <circle cx="12" cy="12" r="8" />
    </svg>
  );
}

export default function TabsPage() {
  return (
    <main className="flex flex-col gap-(--rc-space-6) p-(--rc-space-6)">
      <h1 className="m-0 text-(length:--rc-font-size-24) font-(--rc-font-weight-semibold)">Tabs</h1>

      {/* The selected panel holds a link, so once hydrated it is not a Tab stop itself. */}
      <Section title="Labels">
        <Tabs defaultValue="reviews">
          <TabsList aria-label="Product">
            <TabsTrigger value="details">Details</TabsTrigger>
            <TabsTrigger value="reviews">Reviews</TabsTrigger>
            <TabsTrigger value="shipping">Shipping</TabsTrigger>
          </TabsList>
          <TabsContent value="details" className={PANEL}>
            Made of waxed cotton, with taped seams.
          </TabsContent>
          <TabsContent value="reviews" className={PANEL}>
            Rated 4 of 5 by 120 buyers. <a href="#reviews">Read the reviews</a>
          </TabsContent>
          <TabsContent value="shipping" className={PANEL}>
            Ships in two days.
          </TabsContent>
        </Tabs>
      </Section>

      <Section title="Icon only">
        <Tabs defaultValue="list">
          <TabsList aria-label="Layout">
            <TabsTrigger value="list" aria-label="List" leadingIcon={<Dot />} />
            <TabsTrigger value="grid" aria-label="Grid" leadingIcon={<Dot />} />
          </TabsList>
          <TabsContent value="list" className={PANEL}>
            Shown as a list.
          </TabsContent>
          <TabsContent value="grid" className={PANEL}>
            Shown as a grid.
          </TabsContent>
        </Tabs>
      </Section>

      <Section title="Overflowing, translated">
        <div className="max-w-(--rc-size-panel-sm)" lang="vi">
          <Tabs defaultValue="0">
            <TabsList aria-label="Sản phẩm">
              {TRANSLATED.map((label, index) => (
                <TabsTrigger key={label} value={String(index)}>
                  {label}
                </TabsTrigger>
              ))}
            </TabsList>
            {TRANSLATED.map((label, index) => (
              <TabsContent key={label} value={String(index)} className={PANEL}>
                {`Đang xem: ${label}`}
              </TabsContent>
            ))}
          </Tabs>
        </div>
      </Section>

      {/* The page's direction, from the server: the tabs keep it before and after hydration. */}
      <Section title="Right to left">
        <div dir="rtl" lang="ar">
          <Tabs defaultValue="details">
            <TabsList aria-label="المنتج">
              <TabsTrigger value="details">التفاصيل</TabsTrigger>
              <TabsTrigger value="reviews">المراجعات</TabsTrigger>
              <TabsTrigger value="shipping">الشحن</TabsTrigger>
            </TabsList>
            <TabsContent value="details" className={PANEL}>
              مصنوع من القطن المشمّع.
            </TabsContent>
            <TabsContent value="reviews" className={PANEL}>
              التقييم 4 من 5.
            </TabsContent>
            <TabsContent value="shipping" className={PANEL}>
              يُشحن خلال يومين.
            </TabsContent>
          </Tabs>
        </div>
      </Section>
    </main>
  );
}

import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
});

export const metadata: Metadata = {
  title: "DataFuel — Precios de combustible en tiempo real",
  description:
    "Consulta los precios de gasolina y diésel en gasolineras cercanas a tu ubicación. Filtra por tipo de combustible y radio de búsqueda.",
  keywords: ["gasolina", "diesel", "combustible", "precios", "gasolineras", "barato"],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es" className={`${inter.variable} h-full`}>
      <body className="h-full overflow-hidden font-sans">{children}</body>
    </html>
  );
}

// src/components/SEO/MetaTags.tsx
import React from 'react';
import { Helmet } from 'react-helmet-async';

interface MetaTagsProps {
  title?: string;
  description?: string;
  keywords?: string;
  image?: string;
  url?: string;
  type?: string;
}

const MetaTags: React.FC<MetaTagsProps> = ({
  title = "Motivation Letter AI - Créez des lettres de motivation parfaites avec l'IA",
  description = "Générez des lettres de motivation professionnelles en 30 secondes avec notre IA Gemini Pro. +10k utilisateurs, templates premium, export PDF/Word. Essai gratuit !",
  keywords = "lettre de motivation, IA, motivation letter, cover letter, générateur, templates, emploi, recrutement, candidature",
  image = "https://motivationletter.ai/og-image.jpg",
  url = "https://motivationletter.ai",
  type = "website"
}) => {
  return (
    <Helmet>
      {/* Basic Meta Tags */}
      <title>{title}</title>
      <meta name="description" content={description} />
      <meta name="keywords" content={keywords} />
      <meta name="author" content="Motivation Letter AI" />
      <meta name="robots" content="index, follow" />
      <link rel="canonical" href={url} />

      {/* Open Graph Meta Tags */}
      <meta property="og:type" content={type} />
      <meta property="og:title" content={title} />
      <meta property="og:description" content={description} />
      <meta property="og:image" content={image} />
      <meta property="og:url" content={url} />
      <meta property="og:site_name" content="Motivation Letter AI" />
      
      {/* Twitter Card Meta Tags */}
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={title} />
      <meta name="twitter:description" content={description} />
      <meta name="twitter:image" content={image} />
      
      {/* Additional SEO */}
      <meta name="language" content="French" />
      <meta name="geo.region" content="FR" />
      <meta name="geo.placename" content="France" />
      
      {/* JSON-LD Structured Data */}
      <script type="application/ld+json">
        {JSON.stringify({
          "@context": "https://schema.org",
          "@type": "SoftwareApplication",
          "name": "Motivation Letter AI",
          "description": description,
          "url": url,
          "applicationCategory": "BusinessApplication",
          "operatingSystem": "Web",
          "offers": {
            "@type": "Offer",
            "price": "0",
            "priceCurrency": "EUR",
            "availability": "https://schema.org/InStock"
          },
          "provider": {
            "@type": "Organization",
            "name": "Motivation Letter AI",
            "url": url
          },
          "aggregateRating": {
            "@type": "AggregateRating",
            "ratingValue": "4.9",
            "ratingCount": "10000"
          }
        })}
      </script>
    </Helmet>
  );
};

export default MetaTags;
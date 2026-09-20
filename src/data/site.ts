export const site = {
  name: 'tescgsm',
  tagline: 'Phone batteries and LCD screens',
  url: 'https://tescgsm.es',
  email: 'hello@tescgsm.es',
  location: 'Spain',
  whatsapp: '',
} as const

export const navItems = [
  { label: 'Shop', path: '/shop' },
  { label: 'About', path: '/about' },
  { label: 'Help', path: '/contact' },
]

export {
  categories,
  labelForCategory,
  seedCategories,
  type Brand,
  type Category,
  type CategoryRecord,
  type Product,
} from './catalog.ts'

export const promises = [
  { title: 'Batteries and LCD only', body: 'We start with the two parts repair shops need most.' },
  { title: 'Matched to the model', body: 'Every listing is tied to a specific phone, not a generic pack.' },
  { title: 'For repair work', body: 'Built like a parts counter, not a store for new phones.' },
  { title: 'Ask on WhatsApp', body: 'Stock and fitment questions go to Help until chat is wired.' },
]

export const services = [
  { title: 'Request a quote', body: 'Send the model. We confirm battery or LCD stock.', href: '/contact' },
  { title: 'Returns', body: 'Faulty parts can come back. The process is a placeholder for now.', href: '/contact' },
  { title: 'Order tracking', body: 'Tracking will live here once orders are live.', href: '/contact' },
  { title: 'WhatsApp', body: 'Fast questions about batteries and screens.', href: '/contact' },
]

export const faqs = [
  {
    question: 'Do you sell whole phones?',
    answer: 'Not for now. tescgsm only sells replacement batteries and LCD screens.',
  },
  {
    question: 'Are these original parts?',
    answer:
      'Yes. These are original parts for professional repair work, and they come with a quality guarantee. If a part is faulty, contact us and we will replace it.',
  },
  {
    question: 'Can I get a quote for a model that is not listed yet?',
    answer: 'Yes — use the Help form. Later this can go to WhatsApp.',
  },
]

export function formatPrice(value: number): string {
  return new Intl.NumberFormat('en-GB', {
    style: 'currency',
    currency: 'EUR',
    maximumFractionDigits: 0,
  }).format(value)
}

export function productDetail(product: { model: string; spec: string }): string {
  return `${product.model} · ${product.spec}`
}

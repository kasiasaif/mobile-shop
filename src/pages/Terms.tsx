import { Link } from 'react-router-dom'
import { site } from '../data/site'

const updated = '3 November 2026'

export function Terms() {
  return (
    <section className="page">
      <div className="shell terms">
        <p className="eyebrow">{site.name}</p>
        <h1>Terms and conditions</h1>
        <p className="lede">Last updated {updated}. These terms apply when you buy parts from {site.url.replace('https://', '')}.</p>

        <h2>Who we are</h2>
        <p>
          {site.name} sells replacement phone batteries and LCD screens for repair work, based in {site.location}. You
          can reach us at <a href={`mailto:${site.email}`}>{site.email}</a>.
        </p>

        <h2>The website is still being built</h2>
        <p>
          Some parts of the site are being updated. Product details, stock, and prices can change, and we will confirm
          any order before it is final.
        </p>

        <h2>Products</h2>
        <p>
          Every part is listed for a specific phone model. Please check that the model matches your device before you
          order. Photos are for illustration and the part you receive may look slightly different.
        </p>

        <h2>Prices and payment</h2>
        <p>
          Prices are shown in euros. If a price on the site is wrong, we will contact you before we process the order,
          and you can choose to continue or cancel.
        </p>

        <h2>Orders</h2>
        <p>
          An order is accepted when we confirm it by email. We can decline or cancel an order, for example if a part is
          out of stock, and we will refund anything you have paid.
        </p>

        <h2>Delivery</h2>
        <p>We ship within Spain. Delivery times are estimates and we will let you know if your order is delayed.</p>

        <h2>Returns and faulty parts</h2>
        <p>
          If a part arrives faulty or does not match what you ordered, contact us and we will replace it or refund you.
          Private customers in the EU can also cancel within 14 days of delivery for any reason, as long as the part is
          unused and returned in its original packaging. Parts that have been fitted or damaged during fitting cannot
          be returned unless they were faulty.
        </p>

        <h2>Warranty</h2>
        <p>
          Our parts come with a quality guarantee. This does not cover damage caused by incorrect fitting, accidents,
          or liquid.
        </p>

        <h2>Your account and data</h2>
        <p>
          We use your details only to process your order and contact you about it. We do not sell your data.
        </p>

        <h2>Changes to these terms</h2>
        <p>We may update these terms. The version on this page when you place an order is the one that applies.</p>

        <h2>Questions</h2>
        <p>
          Email <a href={`mailto:${site.email}`}>{site.email}</a> or use the <Link to="/contact">Help</Link> page.
        </p>
      </div>
    </section>
  )
}

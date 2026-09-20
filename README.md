# tescgsm

Public shop for phone-repair parts — batteries and LCD screens for workshops in Spain.

**Shop:** [tescgsm.es](https://tescgsm.es)  
**Admin CRM:** [tescgsm-admin.es](https://tescgsm-admin.es) · [source](https://github.com/kasiasaif/tescgsm-admin)

This pair of projects is an example of how a website can be managed from a separate admin: catalog, prices, and **custom homepage banners**, without putting the shop and the CRM in the same repo.

## How the shop and admin connect

| | Shop (this repo) | Admin ([tescgsm-admin](https://github.com/kasiasaif/tescgsm-admin)) |
| --- | --- | --- |
| Who uses it | Customers | Staff |
| What it does | Browse and filter parts | Create, edit, hide products, categories, and banners |
| Live URL | https://tescgsm.es | https://tescgsm-admin.es |
| Hosting | GitHub Pages from `production` | Render from `production` |

The admin is the control panel. The shop is the public storefront that shows the catalog and banners staff maintain there.

## Try the admin as a visitor

You can explore the CRM without changing live data.

1. Open [tescgsm-admin.es](https://tescgsm-admin.es)
2. Sign in with:
   - **Username:** `visitor`
   - **Password:** `welcome`

A visitor can look around. Saving products, banners, or account details is blocked.





# Dev Environment

- Install all necessary packages with `npm install`
- Install Tailwind from `https://tailwindcss.com/`
- Run Tailwind builder with `npm run tw`
- See live preview of theme with `npm run dev` or `shopify theme dev` (make sure Shopify CLI is installed)
- Tailwind is used for development. All liquid files are included as per the `tailwind-config.js` and are Tailwind classes are _prefixed_ with **twcss-**, for example the `flex` class becomes `twcss-flex` to avoid overwriting Dawn's default styles. For responsive design, prefix as follows: `md:twcss-flex`

# Important - Github Actions

Under .github/workflows/ci.yml you will find the workflows that are set up. These worfklows are:

- Tailwind css update: generates the css file for the whole store, using the tailwind config file (MANDATORY: if this workflow fails, the frontend will break and will no longer receive updates, remaining in a "stuck" state since app.css is not generated anymore. Generating it locally will not fix the issue and instead cause the issue mentioned below under "Git issues". Using Tailwind with Shopify is tricky so we have to generate it like this and we have to do it successfully every time)
- lighthouse: not working currently, optional to monitor performance
- theme-check: checks the Shopify theme for errors before publishing, this usually passes all the time if you have Shopify CLI installed and are using the theme dev

# Git issues - "Please clean your repository tree before checkout"

- There's an unfixed issue with Git for this project. There's a Git Actions workflow set up to generate the app.css file after a commit has been pushed. This usually causes conflicts with the `app.css` file. To resolve this conflict and be able to **fetch/pull** the newer versions you must simply delete the `app.css` file from local and pull it from the remote branch. The `app.css` file is auto-generated from other files so it will not be a breaking change

# Old files

- There's a couple `legacy` files in the theme dir that are actually just copy-pasted sections from the previous theme
- This is important to note because some of these sections might not be very well optimized and might need to be upgraded in the future
- These sections I've prefixed the name with `old_*`, for example the section `old_cart-discounts.liquid` is copied from the previous theme. This file might depend on other old assets which are also prefixed with `old_*` so they're easily identifiable and can be replaced with newer versions in the future
- Replacing them is not necessary from the get-go and might just be an avoidable task; the main focus should be rebuilding Shogun pages first

# New files

- For non-default-theme files, be it either sections or assets I've created after downloading this theme, I've always prefixed with `steelmonks-*` or `sm-*`, for example `sm-parallax-1a.liquid` is a snippet I've made for the colorful titles on the homepage (could not think of a better way to do it than 'hardcoding' it. This method also has translations in mind).
- This prefixing keeps theme clutter to a minimum as we can quickly identify the new files. The sections themselves can be named anything so they don't need the prefix, e.g. naming `steelmonks-parallax.liquid` `Parallax Section` for the user as it is less relevant developer-wise and easier on the user

## Translations

### This is an outline of how the translations should be handled if you _don't want_ to use a translation app

- Complete the move away from Shogun by rebuilding all Shogun pages into Shopify by following the guidelines **from above** by respecting the file-naming system by prefixing new files with `sm` or `steelmonks`; doesn't matter which one, they both do their job just as good and will help development, including most assets except generic assets, such as `cross-icon.liquid` or `minus-icon.liquid`; mostly just icons
- For the rest of the development rules - there's not really any! Build the pages as you best see fit as long as they're created with semantically meaningful HTML (`section`, `article`, `ul`, `a` VS `div`, `span`, etc.)
-

### This is an outline of how the translations should be handled if you _do want_ to use a translation app

- Use the translation app after moving away from Shogun as page builder sections are usually tricky to get detected and translated by an app automatically
- Make sure to avoid the type of sections or snippets such as `sm-parallax-1a.liquid` where there's a funky text of multiple font sizes and colors in an irregular pattern as this will be a pain to translate (see above point)
- Try to keep the sections' texts as settings so the user can change it easily and for it to be translated by the app properly
- Hardcoded texts will be translated, but not always. For criteria, I'm not sure, but it looks like non page-builder pages are more likely to be translated by an app than Shogun pages

## AB Testing

- AB testing is set up to work already
- You can find the instructions on how to use it under the `steelmonks-custom-snippets.liquid` snippet

## Neat tricks

- You can use metafields `{{ product.metafields }}` to output things conditionally `{%- if product.metafields contains "abc" %} class="blue" {% endif -%}`
- You can output any variable you assign with `{% assign my_variable = "variable_name" %}`. Example in `header-mega-menu.liquid`
  - Variable types (you'll most likely only use string, number and boolean, but still useful to know): https://shopify.github.io/liquid/basics/types/
  - Use the previous documentation to find official technical information

## Random intel

- Text highlighting in the header (blue to black gradient) happens thanks to the `--highlighted` class, added conditionally using liquid code that looks for the string `--highlighted` in the link's name and adds the class. See `header-mega-menu.liquid` for the approach. You can add this class anywhere to highlight anything the same way

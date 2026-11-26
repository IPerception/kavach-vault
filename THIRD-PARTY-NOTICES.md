# Third-party notices

Kavach itself is released under the MIT licence (see `LICENSE`). It bundles
third-party libraries under their own licences. The component below is called out
because its licence is source-available rather than OSI open source, and its terms
require this notice when it is redistributed. The fonts below are listed because the SIL
Open Font License asks for its notice to travel with the font files.

## Liquibase 5.0.4

- Used for: database schema migrations (`liquibase-core`, via Spring Boot).
- Copyright: Liquibase Inc.
- Licence: Functional Source License, Version 1.1, ALv2 Future License (FSL-1.1-ALv2).
  Full text: https://fsl.software/FSL-1.1-ALv2.template.md
- Change date: each release converts to the Apache License, Version 2.0 two years
  after that release was made available.

## Fonts: IBM Plex Sans, IBM Plex Mono, Fraunces

- Used for: the interface text (Plex Sans), passwords, keys and codes (Plex Mono) and
  headings (Fraunces). The font files are bundled into the app from the `@fontsource`
  npm packages, because the Content Security Policy blocks font CDNs.
- Copyright: IBM Plex (c) IBM Corp. Fraunces (c) The Fraunces Project Authors
  (Undercase Type).
- Licence: SIL Open Font License, Version 1.1 (OFL-1.1).
  Full text: https://openfontlicense.org/open-font-license-official-text/
- The fonts are used unmodified and are not sold on their own.

Other bundled libraries are under their own licences, which are listed in their jars.

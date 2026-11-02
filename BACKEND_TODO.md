# Backend TODO: lightweight sitemap endpoint

`GET /sitemap.xml` works without this. It pages through `GET /product` and `GET /company/all`,
which takes about 30 requests and returns full DTOs, and it can't report last-modified dates.

Once this endpoint is deployed, the SSR server uses it automatically (`src/sitemap.ts` tries it
first). No frontend change or redeploy is needed beyond restarting pm2 to clear the 6-hour cache.

## 1. DTO: `sitemap/dto/SitemapEntry.java`

```java
package tn.anasazx.tunirate.sitemap.dto;

import java.time.LocalDateTime;

public record SitemapEntry(String type, Long id, LocalDateTime updatedAt) {}
```

## 2. Repository queries

These apply the same visibility rules as the public list endpoints.

`ProductRepository`:

```java
// Product has no updatedAt column yet, so createdAt stands in for it
@Query("""
    select new tn.anasazx.tunirate.sitemap.dto.SitemapEntry('PRODUCT', p.id, p.createdAt)
    from Product p
    where p.status = tn.anasazx.tunirate.enums.ProductStatus.PUBLISHED
      and p.company.status <> tn.anasazx.tunirate.enums.CompanyStatus.SUSPENDED
    order by p.id
    """)
List<SitemapEntry> findSitemapEntries();
```

`CompanyRepository`:

```java
@Query("""
    select new tn.anasazx.tunirate.sitemap.dto.SitemapEntry('COMPANY', c.id, c.updatedAt)
    from Company c
    where c.status <> tn.anasazx.tunirate.enums.CompanyStatus.SUSPENDED
    order by c.id
    """)
List<SitemapEntry> findSitemapEntries();
```

## 3. Controller: `sitemap/controller/SitemapController.java`

```java
package tn.anasazx.tunirate.sitemap.controller;

import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import tn.anasazx.tunirate.company.repository.CompanyRepository;
import tn.anasazx.tunirate.product.repository.ProductRepository;
import tn.anasazx.tunirate.sitemap.dto.SitemapEntry;

import java.util.List;
import java.util.stream.Stream;

@RestController
@RequestMapping("/public/sitemap")
@RequiredArgsConstructor
public class SitemapController {

    private final ProductRepository productRepository;
    private final CompanyRepository companyRepository;

    @GetMapping
    public List<SitemapEntry> getSitemapEntries() {
        return Stream.concat(
                productRepository.findSitemapEntries().stream(),
                companyRepository.findSitemapEntries().stream()
        ).toList();
    }
}
```

## 4. `SecurityConfig`: add `/public/**` to the `permitAll()` list

```java
"/public/**",
```

Without this the endpoint answers 403 and the sitemap keeps using the slower fallback.

## Expected response

```json
[
  { "type": "PRODUCT", "id": 49, "updatedAt": "2026-07-20T10:17:00" },
  { "type": "COMPANY", "id": 11, "updatedAt": "2026-08-01T09:00:00" }
]
```

## Optional follow-up

Add an `updatedAt` column to `Product` (with `@PreUpdate`, as `Company` does) and select it in the
query above, so `<lastmod>` reflects real product edits.

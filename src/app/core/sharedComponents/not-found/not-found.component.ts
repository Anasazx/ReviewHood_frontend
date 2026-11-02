import { Component, OnInit } from '@angular/core';
import {Router, RouterLink} from '@angular/router';
import {SearchBarComponent} from '../../layout/search-bar/search-bar.component';
import {SeoService} from '../../services/seoService/seo.service';

@Component({
  selector: 'app-not-found',
  imports: [
    SearchBarComponent,
    RouterLink
  ],
  templateUrl: './not-found.component.html',
  styleUrl: './not-found.component.css'
})
export class NotFoundComponent implements OnInit {
  constructor(private router: Router, private seo: SeoService) {}

  ngOnInit() {
    this.seo.setStatus(404);
    this.seo.set({ title: 'Page not found · ReviewHood', noindex: true });
  }

  goHome() {
    this.router.navigate(['/']);
  }
}

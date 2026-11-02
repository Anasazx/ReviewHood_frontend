import { Component, OnInit } from '@angular/core';
import { NgIf } from '@angular/common';
import { ToastService } from '../../services/toastService/toast.service';
import { animate, style, transition, trigger } from '@angular/animations';

@Component({
  selector: 'app-toast',
  standalone: true,
  imports: [NgIf],
  templateUrl: './toast.component.html',
  styleUrl: './toast.component.css',
  animations: [
    trigger('toastAnimation', [
      transition(':enter', [
        style({
          opacity: 0,
          transform: 'translateX(100%)'
        }),
        animate(
          '300ms ease-out',
          style({
            opacity: 1,
            transform: 'translateX(0)'
          })
        )
      ]),
      transition(':leave', [
        animate(
          '300ms ease-in',
          style({
            opacity: 0,
            transform: 'translateX(100%)'
          })
        )
      ])
    ])
  ]
})

export class ToastComponent implements OnInit {

  visible = false;
  message = '';
  description = '';

  type: 'success' | 'error' = 'success';

  constructor(private toast: ToastService) {}

  ngOnInit() {
    this.toast.toast$.subscribe(data => {
      this.message = data.message;
      this.description = data.description;
      this.type = data.type;
      this.visible = true;
      setTimeout(() => {
        this.visible = false;
      }, 3000);
    });
  }
}

import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { CommentService } from '../../../../core/services/commentService/comment.service';
import { MyCommentResponse } from '../../../../core/models/dto/commentDTO/myCommentResponse.model';

// Every comment the user wrote, with a link back to the product
@Component({
  selector: 'app-my-comments',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './my-comments.component.html',
})
export class MyCommentsComponent implements OnInit {
  private commentService = inject(CommentService);

  comments: MyCommentResponse[] = [];
  total = 0;
  page = 0;
  last = false;
  loading = false;
  error = false;

  ngOnInit(): void {
    this.loadMore();
  }

  loadMore() {
    if (this.loading || this.last) return;
    this.loading = true;
    this.error = false;
    this.commentService.getMyComments(this.page, 10).subscribe({
      next: res => {
        this.comments = [...this.comments, ...res.content];
        this.total = res.totalElements;
        this.last = res.last;
        this.page++;
        this.loading = false;
      },
      error: () => {
        this.error = true;
        this.loading = false;
      }
    });
  }
}

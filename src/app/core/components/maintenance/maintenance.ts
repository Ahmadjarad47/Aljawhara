import { DOCUMENT } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject, OnDestroy } from '@angular/core';
import { Meta, Title } from '@angular/platform-browser';
import { RouterLink } from '@angular/router';
import { environment } from '../../../../environments/environment';

@Component({
  selector: 'app-maintenance',
  imports: [RouterLink],
  templateUrl: './maintenance.html',
  styleUrl: './maintenance.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Maintenance implements OnDestroy {
  protected readonly settings = environment.maintenance;
  private readonly document = inject(DOCUMENT);
  private readonly title = inject(Title);
  private readonly meta = inject(Meta);
  private readonly previousTitle = this.title.getTitle();
  private readonly previousRobots = this.meta.getTag('name="robots"')?.content;

  constructor() {
    this.title.setTitle('الموقع قيد الصيانة | الجوهرة');
    this.meta.updateTag({ name: 'robots', content: 'noindex, nofollow' });
  }

  ngOnDestroy(): void {
    this.title.setTitle(this.previousTitle);
    if (this.previousRobots !== undefined) {
      this.meta.updateTag({ name: 'robots', content: this.previousRobots });
    } else {
      this.meta.removeTag('name="robots"');
    }
  }

  protected retry(): void {
    this.document.defaultView?.location.reload();
  }
}

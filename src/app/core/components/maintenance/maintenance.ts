import { DOCUMENT } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { Meta, Title } from '@angular/platform-browser';
import { environment } from '../../../../environments/environment';

@Component({
  selector: 'app-maintenance',
  templateUrl: './maintenance.html',
  styleUrl: './maintenance.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Maintenance {
  protected readonly settings = environment.maintenance;
  private readonly document = inject(DOCUMENT);

  constructor() {
    inject(Title).setTitle('الموقع قيد الصيانة | الجوهرة');
    inject(Meta).updateTag({ name: 'robots', content: 'noindex, nofollow' });
  }

  protected retry(): void {
    this.document.defaultView?.location.reload();
  }
}

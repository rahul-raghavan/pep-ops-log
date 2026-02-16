'use client';

import { Button } from '@/components/ui/button';
import { Subject, Observation } from '@/types/database';
import { Download } from 'lucide-react';
import { format } from 'date-fns';

interface DownloadSummaryButtonProps {
  subject: Subject;
  observations: Observation[];
  summaryText?: string;
}

export function DownloadSummaryButton({
  subject,
  observations,
  summaryText,
}: DownloadSummaryButtonProps) {
  function handleDownload() {
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Report - ${subject.name}</title>
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; max-width: 800px; margin: 0 auto; padding: 40px 20px; color: #333; }
          h1 { font-size: 24px; margin-bottom: 4px; }
          .meta { color: #666; font-size: 14px; margin-bottom: 24px; }
          .summary-section { background: #f8f9fa; border-radius: 8px; padding: 20px; margin-bottom: 24px; }
          .summary-section h2 { font-size: 16px; margin: 0 0 12px 0; color: #555; }
          .summary-text { white-space: pre-wrap; font-size: 14px; line-height: 1.6; }
          .obs-list h2 { font-size: 16px; color: #555; margin-bottom: 12px; }
          .obs-item { border-bottom: 1px solid #eee; padding: 12px 0; }
          .obs-item:last-child { border-bottom: none; }
          .obs-header { display: flex; justify-content: space-between; margin-bottom: 6px; font-size: 13px; color: #666; }
          .obs-type { background: #e8e8e8; padding: 2px 8px; border-radius: 4px; font-size: 12px; }
          .obs-text { font-size: 14px; line-height: 1.5; }
          @media print { body { padding: 0; } }
        </style>
      </head>
      <body>
        <h1>${subject.name}</h1>
        <div class="meta">
          ${subject.role.replace('_', ' ')} &middot; ${subject.current_center?.name ?? ''} &middot; Generated ${format(new Date(), 'MMM d, yyyy')}
        </div>

        ${summaryText ? `
        <div class="summary-section">
          <h2>AI Summary</h2>
          <div class="summary-text">${summaryText.replace(/</g, '&lt;').replace(/>/g, '&gt;')}</div>
        </div>
        ` : ''}

        <div class="obs-list">
          <h2>Observations (${observations.length})</h2>
          ${observations.map((obs) => `
            <div class="obs-item">
              <div class="obs-header">
                <span>${format(new Date(obs.observed_at), 'MMM d, yyyy')}</span>
                ${obs.observation_type ? `<span class="obs-type">${obs.observation_type.replace('_', ' ')}</span>` : ''}
              </div>
              <div class="obs-text">${(obs.transcript ?? '').replace(/</g, '&lt;').replace(/>/g, '&gt;')}</div>
            </div>
          `).join('')}
        </div>
      </body>
      </html>
    `;

    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(html);
      printWindow.document.close();
      printWindow.onload = () => {
        printWindow.print();
      };
    }
  }

  return (
    <Button variant="outline" size="sm" onClick={handleDownload}>
      <Download className="w-4 h-4 sm:mr-2" />
      <span className="hidden sm:inline">PDF</span>
    </Button>
  );
}

// Export utilities for PDF generation
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';

/**
 * Export element to PDF
 * @param {HTMLElement|string} elementOrId - DOM element or element ID
 * @param {string} filename - PDF filename without extension
 */
export async function exportToPDF(elementOrId, filename = 'scouting-report') {
  const element = typeof elementOrId === 'string' 
    ? document.getElementById(elementOrId) 
    : elementOrId;
    
  if (!element) {
    console.error('Element not found:', elementOrId);
    return;
  }

  try {
    const canvas = await html2canvas(element, {
      scale: 2,
      useCORS: true,
      backgroundColor: '#ffffff',
      logging: false,
      windowHeight: element.scrollHeight,
      windowWidth: element.scrollWidth,
      allowTaint: true,
    });

    const pdf = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4',
      compress: true,
    });

    const imgWidth = 210; // A4 width in mm
    const imgHeight = (canvas.height * imgWidth) / canvas.width;
    const pageHeight = 290; // Leave 7mm margin at bottom
    let heightLeft = imgHeight;
    let position = 0;

    // Add first page
    const pageWidth = imgWidth - 10; // 5mm margins on each side
    const scaledHeight = (canvas.height * pageWidth) / canvas.width;
    
    pdf.addImage(canvas.toDataURL('image/png'), 'PNG', 5, 5, pageWidth, scaledHeight);
    heightLeft -= pageHeight;

    // Add additional pages as needed
    while (heightLeft > 0) {
      position = heightLeft - scaledHeight;
      pdf.addPage();
      pdf.addImage(canvas.toDataURL('image/png'), 'PNG', 5, position + 5, pageWidth, scaledHeight);
      heightLeft -= pageHeight;
    }

    pdf.save(`${filename}.pdf`);
    return true;
  } catch (error) {
    console.error('PDF export failed:', error);
    throw error;
  }
}

/**
 * Export data to JSON
 */
export function exportToJSON(data, filename = 'data') {
  const json = JSON.stringify(data, null, 2);
  const blob = new Blob([json], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  
  const link = document.createElement('a');
  link.href = url;
  link.download = `${filename}.json`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Print specific element
 */
export function printElement(elementId) {
  const element = document.getElementById(elementId);
  if (!element) return;

  const printWindow = window.open('', '_blank');
  printWindow.document.write(`
    <html>
      <head>
        <title>Scouting Report</title>
        <style>
          body { 
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            padding: 20px;
          }
          @media print {
            body { padding: 0; }
          }
        </style>
      </head>
      <body>${element.innerHTML}</body>
    </html>
  `);
  printWindow.document.close();
  printWindow.print();
}

import io
from .models import Prescription
from reportlab.lib.pagesizes import letter
from reportlab.pdfgen import canvas
from reportlab.lib.units import inch
from django.utils.timezone import localtime

class PDFGenerationService:
    @staticmethod
    def generate_prescription_pdf(prescription_id):
        try:
            prescription = Prescription.objects.select_related('consultation__patient', 'prescribed_by__user').prefetch_related('items').get(id=prescription_id)
        except Prescription.DoesNotExist:
            return None

        patient = prescription.consultation.patient
        doctor = prescription.prescribed_by
        items = prescription.items.all()

        pdf_file = io.BytesIO()
        c = canvas.Canvas(pdf_file, pagesize=letter)
        width, height = letter

        # Header
        c.setFont("Helvetica-Bold", 16)
        c.drawString(1 * inch, height - 1 * inch, "MEDITEK")
        c.setFont("Helvetica", 10)
        c.drawString(1 * inch, height - 1.2 * inch, "Quartier Kotto, Douala")
        c.drawString(1 * inch, height - 1.4 * inch, "Tél: 696481718")

        # Title
        c.setFont("Helvetica-Bold", 18)
        c.drawCentredString(width / 2.0, height - 2 * inch, "ORDONNANCE MEDICALE")

        # Patient & Doctor Info
        c.setFont("Helvetica", 12)
        y = height - 2.5 * inch
        c.drawString(1 * inch, y, f"Patient: {patient.get_full_name()} (MRN: {patient.mrn})")
        c.drawRightString(width - 1 * inch, y, f"Date: {localtime(prescription.created_at).strftime('%d/%m/%Y')}")
        y -= 0.3 * inch
        c.drawString(1 * inch, y, f"Médecin: {doctor.get_full_name()} ({doctor.specialization or 'Généraliste'})")
        
        # Items
        y -= 0.8 * inch
        c.setFont("Helvetica-Bold", 14)
        c.drawString(1 * inch, y, "Prescriptions:")
        y -= 0.3 * inch
        
        c.setFont("Helvetica", 12)
        for i, item in enumerate(items, 1):
            if y < 1 * inch:
                c.showPage()
                c.setFont("Helvetica", 12)
                y = height - 1 * inch
            
            c.drawString(1.2 * inch, y, f"{i}. {item.medication_name}")
            y -= 0.2 * inch
            c.setFont("Helvetica-Oblique", 10)
            c.drawString(1.5 * inch, y, f"Posologie: {item.dosage} | Fréquence: {item.frequency} | Durée: {item.duration}")
            if item.instructions:
                y -= 0.15 * inch
                c.drawString(1.5 * inch, y, f"Instructions: {item.instructions}")
            y -= 0.3 * inch
            c.setFont("Helvetica", 12)

        # Footer
        c.setFont("Helvetica-Oblique", 10)
        c.drawCentredString(width / 2.0, 1 * inch, "Document généré électroniquement par MediTek HIS")

        c.save()
        return pdf_file.getvalue()


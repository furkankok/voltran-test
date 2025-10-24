import requests
from pathlib import Path
from django.core.management.base import BaseCommand


class Command(BaseCommand):
    help = 'Test upload endpoint by sending PDF files from the command directory'

    def handle(self, *args, **options):
        command_dir = Path(__file__).parent
        pdf_files = list(command_dir.glob('*.pdf'))
        
        if not pdf_files:
            self.stdout.write(self.style.ERROR('No PDF files found in the commands directory'))
            return
        
        answer_key_file = None
        student_exam_files = []
        
        for pdf_file in pdf_files:
            if 'Cevap Anahtarı' in pdf_file.name or 'answer' in pdf_file.name.lower():
                answer_key_file = pdf_file
            else:
                student_exam_files.append(pdf_file)
        
        if not answer_key_file:
            self.stdout.write(self.style.ERROR('Answer key file (Cevap Anahtarı.pdf) not found'))
            return
        
        if not student_exam_files:
            self.stdout.write(self.style.ERROR('No student exam files found'))
            return
        
        base_url = 'http://127.0.0.1:8000'
        upload_url = f'{base_url}/api/scans/upload/'
        
        self.stdout.write(self.style.SUCCESS(f'Found {len(pdf_files)} PDF file(s)'))
        self.stdout.write(f'Upload URL: {upload_url}')
        self.stdout.write('-' * 50)
        
        self.stdout.write('\nAnswer Key:')
        self.stdout.write(f'  - {answer_key_file.name}')
        self.stdout.write(f'\nStudent Exams ({len(student_exam_files)}):')
        for exam_file in student_exam_files:
            self.stdout.write(f'  - {exam_file.name}')
        
        try:
            files = []
            file_handles = []
            
            answer_key_handle = open(answer_key_file, 'rb')
            file_handles.append(answer_key_handle)
            files.append(('answer_key', (answer_key_file.name, answer_key_handle, 'application/pdf')))
            
            for exam_file in student_exam_files:
                exam_handle = open(exam_file, 'rb')
                file_handles.append(exam_handle)
                files.append(('student_exams', (exam_file.name, exam_handle, 'application/pdf')))
            
            response = requests.post(upload_url, files=files)
            
            for f in file_handles:
                f.close()
            
            if response.status_code == 200:
                self.stdout.write(self.style.SUCCESS('\n✓ Successfully uploaded all files'))
                self.stdout.write(f'  Response: {response.json()}')
            else:
                self.stdout.write(self.style.ERROR('\n✗ Failed to upload files'))
                self.stdout.write(f'  Status code: {response.status_code}')
                self.stdout.write(f'  Response: {response.text}')
                
        except requests.exceptions.ConnectionError:
            self.stdout.write(self.style.ERROR(f'\n✗ Connection error. Make sure Django server is running on {base_url}'))
        except Exception as e:
            self.stdout.write(self.style.ERROR(f'\n✗ Error uploading files: {str(e)}'))
        
        self.stdout.write('\n' + '-' * 50)
        self.stdout.write(self.style.SUCCESS('Upload test completed'))


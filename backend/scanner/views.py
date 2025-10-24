from django.http import StreamingHttpResponse
from .services.openai import ReadAnswerKeyService, ReadStudentAnswersService, EvaluateStudentAnswersService, ContuniueChatService
import json

import asyncio
from asgiref.sync import sync_to_async

async def upload_scan(request):
    response_id = request.POST.get('response_id')
    message = request.POST.get('message')
    
    if response_id and message:
        return await handle_chat_continue(response_id, message)
    
    student_exams = request.FILES.getlist('student_exams')
    answer_key_file = request.FILES.get('answer_key')

    async def event_generator():
        try:
            yield format_sse_event('status', {'stage': 'answer_key_reading', 'message': 'Cevap anahtarı okunuyor...'})
            
            read_answer_key_service = ReadAnswerKeyService()
            answer_key = await sync_to_async(read_answer_key_service.read_answer_key)(answer_key_file)
            
            yield format_sse_event('answer_key_complete', {
                'message': 'Cevap anahtarı okunması tamamlandı',
                'data': answer_key
            })
            
            yield format_sse_event('status', {'stage': 'student_reading', 'message': f'{len(student_exams)} öğrenci sınavı okunuyor...'})
            
            read_student_answers_service = ReadStudentAnswersService()
            
            async def read_one_student(exam):
                return await sync_to_async(read_student_answers_service.read_student_answers)(exam)
            
            student_answers = await asyncio.gather(
                *[read_one_student(exam) for exam in student_exams]
            )
            
            yield format_sse_event('student_reading_complete', {
                'message': 'Öğrenci sınavları okunması tamamlandı',
                'count': len(student_answers),
                'data': student_answers
            })
            
            yield format_sse_event('status', {'stage': 'evaluation', 'message': 'Değerlendirme başlatılıyor...'})
            
            evaluate_student_answers_service = EvaluateStudentAnswersService()
            response_stream = await sync_to_async(evaluate_student_answers_service.evaluate_student_answers)(student_answers, answer_key)
            
            full_text = ""
            current_response_id = None
            
            for event in response_stream:
                print(event)
                if hasattr(event, 'type'):
                    yield format_sse_event('debug', {
                        'event_type': event.type,
                        'has_delta': hasattr(event, 'delta')
                    })
                    
                    if event.type == 'response.created' and hasattr(event, 'response'):
                        current_response_id = event.response.id
                        yield format_sse_event('response_id', {
                            'response_id': current_response_id
                        })
                    elif event.type == 'response.output_text.delta':
                        if hasattr(event, 'delta'):
                            full_text += event.delta
                            yield format_sse_event('evaluation_chunk', {
                                'delta': event.delta
                            })
                    elif event.type == 'response.completed':
                        break
            
            yield format_sse_event('evaluation_complete', {
                'message': 'Değerlendirme tamamlandı',
                'full_text': full_text,
                'response_id': current_response_id
            })
            
            yield format_sse_event('done', {'message': 'Tüm işlemler tamamlandı'})
            
        except Exception as e:
            yield format_sse_event('error', {'message': f'Hata: {str(e)}'})
    
    response = StreamingHttpResponse(
        event_generator(),
        content_type='text/event-stream'
    )
    response['Cache-Control'] = 'no-cache'
    response['X-Accel-Buffering'] = 'no'
    return response

async def handle_chat_continue(response_id: str, message: str):
    async def event_generator():
        try:
            yield format_sse_event('status', {'stage': 'chat', 'message': 'Mesajınız işleniyor...'})
            
            continue_chat_service = ContuniueChatService()
            response_stream = await sync_to_async(continue_chat_service.continue_chat)(response_id, message)
            
            full_text = ""
            current_response_id = None
            
            for event in response_stream:
                if hasattr(event, 'type'):
                    if event.type == 'response.created' and hasattr(event, 'response'):
                        current_response_id = event.response.id
                        yield format_sse_event('response_id', {
                            'response_id': current_response_id
                        })
                    elif event.type == 'response.output_text.delta':
                        if hasattr(event, 'delta'):
                            full_text += event.delta
                            yield format_sse_event('chat_chunk', {
                                'delta': event.delta
                            })
                    elif event.type == 'response.completed':
                        break
            
            yield format_sse_event('chat_complete', {
                'message': 'Cevap tamamlandı',
                'full_text': full_text,
                'response_id': current_response_id
            })
            
            yield format_sse_event('done', {'message': 'Chat mesajı tamamlandı'})
            
        except Exception as e:
            yield format_sse_event('error', {'message': f'Hata: {str(e)}'})
    
    response = StreamingHttpResponse(
        event_generator(),
        content_type='text/event-stream'
    )
    response['Cache-Control'] = 'no-cache'
    response['X-Accel-Buffering'] = 'no'
    return response

def format_sse_event(event_type: str, data: dict) -> str:
    return f"event: {event_type}\ndata: {json.dumps(data, ensure_ascii=False)}\n\n"
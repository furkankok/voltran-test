from openai import OpenAI
from dataclasses import dataclass
from django.core.files.base import ContentFile
import base64
import json

ANSWER_KEY_PROMPT = """Extract all questions and their corresponding answers from an answer key document. For each question-answer pair:

- Identify the full question number or label, supporting multiple languages or variants (such as "Soru 1:" or "Question 1:"). Use only the numerical value (e.g., 1).
- Extract the entire question text exactly as presented in the document. This must include any instructions, introductory context, and the actual question—preserve all original formatting, line breaks, and structural features.
- Extract the complete answer text associated with each question, preserving formatting, line breaks, and any original structure (including lists, tables, or code blocks).
- Maintain the strict original order of question–answer pairs as they appear in the source document.
- Preserve the full, original text for both the question and the answer—do not summarize, paraphrase, or omit any portion of either.
- Clearly delineate the boundary between question and answer for each pair, based on document cues. If in doubt, include all consecutive text until a new question indicator is encountered or the document ends.
- Continue extraction until all question–answer pairs have been processed before returning the output.

# Output Format

Return a JSON array. Each entry is a JSON object with the following fields:
  - question_number (integer)
  - question (string; full question text, verbatim)
  - answer (string; full answer text, verbatim)

Do not use code block formatting.

# Example

Example input (document excerpt):

Soru 1: Goethe '3000 yıllık geçmişinin hesabını yapamayan insan, günübirlik yaşayan insandır.' diyordu. Biz gerçekten biliyor muyuz tarihimizi? ... Goethe bu sözüyle neyi vurgulamıştır? Açıklayınız.  
Goethe bu sözüyle, bireyin ve toplumun kendi geçmişini bilmesinin önemini vurgulamaktadır...

Output should be:

[
  {
    "question_number": 1,
    "question": "Goethe '3000 yıllık geçmişinin hesabını yapamayan insan, günübirlik yaşayan insandır.' diyordu. Biz gerçekten biliyor muyuz tarihimizi? ... Goethe bu sözüyle neyi vurgulamıştır? Açıklayınız.",
    "answer": "Goethe bu sözüyle, bireyin ve toplumun kendi geçmişini bilmesinin önemini vurgulamaktadır..."
  }
]

(For longer documents, the JSON array will contain one object per question–answer pair in order. Each 'question' and 'answer' field must contain the entire, original text, accurately reflecting all structure.)

# Notes

- Question–answer boundaries may be signaled by new question numbers, headings, or line formatting. Include all contiguous answer content following each question until the next question, or until the end of the document.
- If a question or answer spans multiple paragraphs or includes lists, tables, or block elements, reproduce these exactly in the corresponding field.
- Do not omit any part of either questions or answers.
- For multilingual variants (e.g., "Question 5:", "Soru 6:"), always use the numeric part only as question_number.
- IMPORTANT!!! Remove the "\n" sign ( Enter ) in text.

# Reminder

Your objective: For each question–answer pair in the document, extract and output both the question and its answer, preserving original formatting, in a JSON array with each pair as a separate object. Do not alter, paraphrase, or omit any content from either field."""

ANSWER_KEY_SCHEMA = {
    "type": "json_schema",
    "name": "answer_key",
    "strict": True,
    "schema": {
        "type": "object",
        "properties": {
            "questions": {
                "type": "array",
                "description": "Array of questions.",
                "items": {
                    "type": "object",
                    "properties": {
                        "question_number": {
                            "type": "integer",
                            "description": "The question number.",
                        },
                        "question": {
                            "type": "string",
                            "description": "The complete question text.",
                        },
                        "answer": {
                            "type": "string",
                            "description": "The correct answer for the question.",
                        },
                    },
                    "required": ["question_number", "question", "answer"],
                    "additionalProperties": False,
                },
            }
        },
        "required": ["questions"],
        "additionalProperties": False,
    },
}

STUDENT_EXAM_PROMPT = """Extract the student's name, all questions, and the student's answers from the exam paper. For each question-answer pair:

- First, identify and extract the student's name from the exam paper (usually found at the top of the document).
- Identify the full question number or label, supporting multiple languages or variants (such as "Soru 1:" or "Question 1:"). Use only the numerical value (e.g., 1).
- Extract the entire question text exactly as presented in the document. This must include any instructions, introductory context, and the actual question—preserve all original formatting, line breaks, and structural features.
- Extract the student's answer text for each question, preserving formatting, line breaks, and any original structure (including lists, tables, or code blocks).
- Maintain the strict original order of question–answer pairs as they appear in the source document.
- Preserve the full, original text for both the question and the student's answer—do not summarize, paraphrase, or omit any portion of either.
- Clearly delineate the boundary between question and answer for each pair, based on document cues. If in doubt, include all consecutive text until a new question indicator is encountered or the document ends.
- Continue extraction until all question–answer pairs have been processed before returning the output.

# Output Format

Return a JSON object with the following structure:
  - student_name (string; the name of the student)
  - questions (array of objects, each containing):
    - question_number (integer)
    - question (string; full question text, verbatim)
    - student_answer (string; student's answer text, verbatim)

Do not use code block formatting.

# Example

Example input (document excerpt):

Name: Ahmet Yılmaz

Soru 1: Goethe '3000 yıllık geçmişinin hesabını yapamayan insan, günübirlik yaşayan insandır.' diyordu. Biz gerçekten biliyor muyuz tarihimizi? ... Goethe bu sözüyle neyi vurgulamıştır? Açıklayınız.
Cevap: Goethe insanların tarihlerini bilmeleri gerektiğini söylemiştir...

Output should be:

{
  "student_name": "Ahmet Yılmaz",
  "questions": [
    {
      "question_number": 1,
      "question": "Goethe '3000 yıllık geçmişinin hesabını yapamayan insan, günübirlik yaşayan insandır.' diyordu. Biz gerçekten biliyor muyuz tarihimizi? ... Goethe bu sözüyle neyi vurgulamıştır? Açıklayınız.",
      "student_answer": "Goethe insanların tarihlerini bilmeleri gerektiğini söylemiştir..."
    }
  ]
}

(For longer documents, the questions array will contain one object per question–answer pair in order. Each 'question' and 'student_answer' field must contain the entire, original text, accurately reflecting all structure.)

# Notes

- Question–answer boundaries may be signaled by new question numbers, headings, or line formatting. Include all contiguous answer content following each question until the next question, or until the end of the document.
- If a question or student's answer spans multiple paragraphs or includes lists, tables, or block elements, reproduce these exactly in the corresponding field.
- Do not omit any part of either questions or student answers.
- For multilingual variants (e.g., "Question 5:", "Soru 6:"), always use the numeric part only as question_number.
- IMPORTANT!!! Remove the "\n" sign ( Enter ) in text.
- The student's name may appear in various formats (e.g., "Name:", "Ad Soyad:", "Student:", "Öğrenci:"). Extract the actual name value.

# Reminder

Your objective: Extract the student's name and for each question–answer pair in the exam paper, extract and output both the question and the student's answer, preserving original formatting, in a JSON object with the student_name field and a questions array with each pair as a separate object. Do not alter, paraphrase, or omit any content from either field."""

STUDENT_EXAM_SCHEMA = {
    "type": "json_schema",
    "name": "student_exam",
    "strict": True,
    "schema": {
        "type": "object",
        "properties": {
            "student_name": {
                "type": "string",
                "description": "The name of the student.",
            },
            "questions": {
                "type": "array",
                "description": "Array of questions with student answers.",
                "items": {
                    "type": "object",
                    "properties": {
                        "question_number": {
                            "type": "integer",
                            "description": "The question number.",
                        },
                        "question": {
                            "type": "string",
                            "description": "The complete question text.",
                        },
                        "student_answer": {
                            "type": "string",
                            "description": "The student's answer for the question.",
                        },
                    },
                    "required": ["question_number", "question", "student_answer"],
                    "additionalProperties": False,
                },
            },
        },
        "required": ["student_name", "questions"],
        "additionalProperties": False,
    },
}


@dataclass
class ReadAnswerKeyService:
    client: OpenAI

    def __init__(self):
        self.client = OpenAI()

    def read_answer_key(self, file: ContentFile) -> list[dict]:
        response = self.client.responses.create(
            model="gpt-5",
            input=[
                {
                    "role": "developer",
                    "content": [
                        {
                            "type": "input_text",
                            "text": ANSWER_KEY_PROMPT,
                        }
                    ],
                },
                {
                    "role": "user",
                    "content": [
                        {
                            "type": "input_file",
                            "filename": "Cevap Anahtarı.pdf",
                            "file_data": "data:application/pdf;base64,"
                            + base64.b64encode(file.read()).decode("utf-8"),
                        }
                    ],
                },
            ],
            text={
                "format": ANSWER_KEY_SCHEMA,
                "verbosity": "high",
            },
            reasoning={"effort": "minimal"},
            store=True,
        )

        print(response.output_text)

        return json.loads(response.output_text)


@dataclass
class ReadStudentAnswersService:
    client: OpenAI

    def __init__(self):
        self.client = OpenAI()

    def read_student_answers(self, file: ContentFile) -> dict:
        response = self.client.responses.create(
            model="gpt-5",
            input=[
                {
                    "role": "developer",
                    "content": [
                        {
                            "type": "input_text",
                            "text": STUDENT_EXAM_PROMPT,
                        }
                    ],
                },
                {
                    "role": "user",
                    "content": [
                        {
                            "type": "input_file",
                            "filename": "Student_Exam.pdf",
                            "file_data": "data:application/pdf;base64,"
                            + base64.b64encode(file.read()).decode("utf-8"),
                        }
                    ],
                },
            ],
            text={
                "format": STUDENT_EXAM_SCHEMA,
                "verbosity": "high",
            },
            reasoning={"effort": "minimal"},
            store=True,
        )

        print(response.output_text)

        return json.loads(response.output_text)


EVALUATE_STUDENT_ANSWERS_PROMPT = """Evaluate each student's exam answers against an answer key (both provided in JSON format), scoring each question out of 10 and providing objective, constructive feedback IN TURKISH. You will evaluate EACH STUDENT SEPARATELY, one after another.

For each student:

1. Start with the student's name as a header
2. For each question, provide:
   - Question number and score (e.g., "Soru 1: 10 üzerinden 7")
   - A SINGLE SENTENCE explanation in Turkish justifying the score (compare student's answer to the answer key, identify what's correct, what's missing)
   - Keep explanations BRIEF and CONCISE (maximum one sentence)
   - DO NOT include the full question text or full student answer
   - WRITE ALL EXPLANATIONS IN TURKISH
   
3. After all questions for that student:
   - Calculate overall average score
   - Provide a final summary report IN TURKISH that highlights:
     * The student's strengths (Güçlü Yönler)
     * The student's weaknesses (Zayıf Yönler)
     * Knowledge gaps and areas for improvement (Konu Boşlukları)

Scoring Guide:
- 10: Fully correct and complete
- 7-9: Mostly correct but some details missing
- 5-6: Basic understanding but superficial or incomplete
- 3-4: Major parts missing or misunderstood
- 0-2: Off-topic, incorrect, or blank

# Output Format

Use plain text only with clear structure. Evaluate EACH student separately. ALL TEXT MUST BE IN TURKISH.

[Student Name]:

Soru 1: 10 üzerinden [score]
[ONE brief sentence in Turkish explaining the score]

Soru 2: 10 üzerinden [score]
[ONE brief sentence in Turkish explaining the score]

...

Genel Ortalama: [average]/10

Özet Rapor:
Güçlü Yönler: [List student's strengths in Turkish]
Zayıf Yönler: [List student's weaknesses in Turkish]
Konu Boşlukları: [Identify specific knowledge gaps in Turkish]

---

[Next Student Name]:

[Same format for next student]

...

# Example

Can Vural:

Soru 1: 10 üzerinden 2
Student completely misunderstood the question. The answer key emphasizes the importance of historical consciousness and learning from the past, but the student incorrectly interpreted Goethe's quote as being about mathematics and financial calculations. This shows a fundamental misunderstanding of the concept.

Soru 2: 10 üzerinden 3
The answer is superficial and misses the main point. While the student mentions learning about historical conflicts, they fail to explain how historical knowledge provides insight into the roots of problems and helps avoid repeating mistakes. The example given (social media discussions) is not appropriate and shows shallow understanding.

...

Genel Ortalama: 2.5/10

Özet Rapor:
Güçlü Yönler: Student attempts to provide concrete examples in some answers.
Zayıf Yönler: Fundamental misunderstanding of key historical concepts, inability to grasp abstract ideas, lack of analytical thinking, superficial reasoning.
Konu Boşlukları: Historical consciousness, cause-effect relationships in history, historical empathy, objectivity in historiography, significance of primary sources. Student needs to work on conceptual understanding and critical thinking skills.

---

Ayşe Yılmaz:

Soru 1: 10 üzerinden 10
Excellent answer that fully captures the essence of Goethe's quote. The student clearly explains the importance of historical consciousness, how it relates to understanding events holistically, and how lack of historical knowledge leads to superficial living. All key points from the answer key are covered.

...

# Notes
- Evaluate EACH student separately in sequence
- Do NOT include full question texts
- DO NOT include full student answers
- Provide concise but meaningful explanations for each score
- Always end each student's evaluation with the summary report"""


@dataclass
class EvaluateStudentAnswersService:
    client: OpenAI

    def __init__(self):
        self.client = OpenAI()

    def evaluate_student_answers(self, student_answers: list[dict], answer_key: dict):
        inputs = [
            {
                "role": "developer",
                "content": [
                    {"type": "input_text", "text": EVALUATE_STUDENT_ANSWERS_PROMPT}
                ],
            },
            {
                "role": "assistant",
                "content": [
                    {
                        "type": "output_text",
                        "text": str(answer_key),
                    }
                ],
            },
        ]
        for student_answer in student_answers:
            inputs.append(
                {
                    "role": "assistant",
                    "content": [{"type": "output_text", "text": str(student_answer)}],
                }
            )
        response = self.client.responses.create(
            model="gpt-5",
            input=inputs,
            text={"format": {"type": "text"}, "verbosity": "medium"},
            reasoning={"effort": "medium"},
            tools=[],
            store=True,
            include=["reasoning.encrypted_content", "web_search_call.action.sources"],
            stream=True,
        )

        return response


@dataclass
class ContuniueChatService:
    client: OpenAI

    def __init__(self):
        self.client = OpenAI()

    def continue_chat(self, response_id: str, message: str):
        response_stream = self.client.responses.create(
            previous_response_id=response_id,
            model="gpt-5",
            text={"format": {"type": "text"}, "verbosity": "medium"},
            reasoning={"effort": "medium"},
            input=[
                {
                    "role": "user",
                    "content": message
                }
            ],
            store=True,
            stream=True,
        )

        return response_stream
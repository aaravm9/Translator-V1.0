# Translation Web Application -- Software Requirements Specification (SRS)

## 1. Introduction

### 1.1 Purpose

This document describes the **software requirements** for a **web-based
translation application** that runs on a **local server**. The
application allows users to translate text between multiple languages
using a **locally hosted machine learning translation model**.

The system will provide a **modern frontend interface**, a **backend
API**, and a **translation engine**, along with features such as speech
input, file translation, translation history, and user authentication.

### 1.2 Scope

The Translation Web Application will:

-   Translate text between **10--15 global languages**
-   Operate from a **local server environment**
-   Provide **real-time translation**
-   Support **text, speech, and file translation**
-   Allow users to **create accounts and save translation history**
-   Provide **text-to-speech output**
-   Offer a **modern UI with dark mode**

### 1.3 Supported Languages

1.  English\
2.  Hindi\
3.  Spanish\
4.  French\
5.  German\
6.  Chinese\
7.  Japanese\
8.  Korean\
9.  Arabic\
10. Russian\
11. Portuguese\
12. Italian\
13. Turkish\
14. Indonesian\
15. Bengali

------------------------------------------------------------------------

## 2. System Overview

The application follows a **three-tier architecture**:

Frontend (React Web App)\
REST API\
Backend Server (FastAPI)\
Translation Engine (NLLB / MarianMT Model)\
Database (PostgreSQL)

------------------------------------------------------------------------

## 3. Technology Stack

### Frontend

-   React.js
-   Tailwind CSS
-   Axios

### Backend

-   Python FastAPI

### Translation Model

-   Meta NLLB (No Language Left Behind)
-   MarianMT

### Database

-   PostgreSQL

### Additional Tools

-   Docker
-   Git

------------------------------------------------------------------------

## 4. Functional Requirements

### 4.1 User Authentication

The system must allow users to: - Register - Login - Logout - Save
translation history

Inputs: - Email - Password

Output: - Authentication token

### 4.2 Text Translation

Users must be able to: - Enter text in a source language - Select a
target language - Receive translated output

### 4.3 Automatic Language Detection

The system should automatically detect the language of the input text.

### 4.4 Speech-to-Text Translation

Users can speak into their microphone and the system converts speech
into text and translates it.

### 4.5 Text-to-Speech Output

Users can listen to translated text.

### 4.6 File Translation

Supported formats: - TXT - PDF - DOCX

### 4.7 Translation History

The system stores: - Original text - Translated text - Source language -
Target language - Timestamp

### 4.8 Copy and Export Translation

Users can copy translated text or export it as a file.

### 4.9 Dark Mode

Users can switch between light and dark UI themes.

------------------------------------------------------------------------

## 5. Non‑Functional Requirements

### Performance

Translation response time should be under **3 seconds**.

### Security

-   Password hashing
-   JWT authentication

### Usability

-   Simple UI
-   Responsive design

### Reliability

System should handle multiple translation requests.

------------------------------------------------------------------------

## 6. Database Schema

### Users Table

  Field           Type        Description
  --------------- ----------- --------------------
  id              UUID        Unique user ID
  email           VARCHAR     User email
  password_hash   VARCHAR     Encrypted password
  created_at      TIMESTAMP   Account creation

### Translation History Table

  Field             Type        Description
  ----------------- ----------- ---------------------
  id                UUID        Translation ID
  user_id           UUID        Linked user
  source_language   VARCHAR     Original language
  target_language   VARCHAR     Translated language
  source_text       TEXT        Input text
  translated_text   TEXT        Output text
  created_at        TIMESTAMP   Translation time

### Saved Translations Table

  Field            Type   Description
  ---------------- ------ --------------------
  id               UUID   Saved item ID
  user_id          UUID   Owner
  translation_id   UUID   Linked translation

------------------------------------------------------------------------

## 7. API Design

### Register

POST /api/register

Request: { "email": "user@example.com", "password": "password123" }

### Login

POST /api/login

### Translate

POST /api/translate

Request: { "source_language": "English", "target_language": "Spanish",
"text": "Hello world" }

Response: { "translated_text": "Hola mundo" }

### History

GET /api/history

### File Translation

POST /api/translate-file

------------------------------------------------------------------------

## 8. User Interface Overview

Main Page Components:

-   Text input box
-   Language selector
-   Translate button
-   Output panel
-   Copy button
-   Audio playback button

Dashboard:

-   Translation history
-   Saved translations
-   Account settings

------------------------------------------------------------------------

## 9. Future Improvements

-   Mobile application
-   Real‑time conversation translation
-   OCR image translation
-   Browser extension
-   Cloud deployment

------------------------------------------------------------------------

## 10. Development Roadmap

### Phase 1

Backend API + Translation model

### Phase 2

Frontend UI

### Phase 3

Authentication + history

### Phase 4

Speech + file translation

### Phase 5

Testing and deployment

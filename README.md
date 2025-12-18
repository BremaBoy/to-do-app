# Smart Voice To-Do List App

A modern, feature-rich Task Management application built with **React Native** and **Expo**. This app allows users to efficiently manage their daily tasks with advanced features like voice-to-text task creation involving AI-powered natural language processing.

## Core Features

### 1. Task Management
- **Add New Tasks**: Create tasks with a title and optional description.
- **Task completion**: Toggle tasks as completed or incomplete.
- **Delete Tasks**: Remove unwanted tasks from the list.
- **Smart Validation**: User feedback for empty or invalid inputs.

### 2. Task Display
- **Organized List**: View all tasks in a clean, scrollable interface.
- **Visual Distinction**: Clear visual separation between active and completed tasks (strikethrough styling, muted colors).
- **Filtering**: Filter tasks by "All", "Today", "Upcoming", or "Overdue".

### 3. Data Persistence
- **AsyncStorage**: All tasks and user preferences (like Dark Mode) are saved locally on the device, ensuring data persists between app launches.

### 4. Navigation
- **Stack Navigation**: Smooth transitions between the **Task List Screen** and **Add Task Screen** using React Navigation.

### 5. Advanced UI/UX
- **Clean Design**: A minimalist, distraction-free interface.
- **Dark/Light Mode**: Full theme support that toggles across all screens and persists user preference.
- **Animations**: Subtle animations for micro-interactions (e.g., voice recording pulse).

### 6. Voice Input (AI Powered)
- **Floating Action Button**: Dedicated FAB to trigger voice mode.
- **Speech-to-Text**: Integrates with **Groq (Whisper)** for high-accuracy transcription.
- **Intelligent Splitting**: Automatically splits multiple commands into separate tasks (e.g., "Buy milk and call John" becomes two tasks).

## Tech Stack

- **Framework**: React Native (Expo SDK 52+)
- **Language**: TypeScript
- **Navigation**: React Navigation (Native Stack)
- **Storage**: @react-native-async-storage/async-storage
- **Audio**: expo-av
- **Icons**: @expo/vector-icons (Feather)
- **API**: Fetch API for Groq/OpenAI integration

## Setup Instructions

1.  **Clone the repository**
    ```bash
    git clone <repository-url>
    cd todo-app
    ```

2.  **Install dependencies**
    ```bash
    npm install
    ```

3.  **Configure Environment**
    - The API Key for Groq is currently set in `src/Services/VoiceService.ts`. For production, move this to an `.env` file.

4.  **Build & Run (EAS App Mode)**
    This project is configured for **EAS Build** (Development Client), not standard Expo Go.

    -   **Install EAS CLI**:
        ```bash
        npm install -g eas-cli
        ```

    -   **Build Development Client**:
        ```bash
        eas build --profile development --platform android
        # or
        eas build --profile development --platform ios
        ```

    -   **Run the Dev Client**:
        Once installed on your device:
        ```bash
        npx expo start --dev-client
        ```

## Project Structure

```
src/
├── Components/    # Reusable UI components (TaskItem, VoiceModal, etc.)
├── Context/       # Global State (ThemeContext)
├── Navigation/    # Navigation configuration
├── Screens/       # Main app screens (TaskList, AddTask)
├── Services/      # Business logic (Storage, Voice, API)
└── Types/         # TypeScript definitions
```

## Bonus Features Implemented
- ✅ **Dark Mode**: Global, persistent theme support.
- ✅ **Due Dates**: Full support for adding due dates and sorting/filtering by them.
- ✅ **Search**: Real-time task searching.
- ✅ **TypeScript**: Fully typed codebase for reliability.

import React from 'react';
import { createBrowserRouter } from 'react-router';
import { LoginPage } from './pages/LoginPage';
import { Layout } from './components/Layout';
import { IntroPage } from './pages/IntroPage';
import { HomePage } from './pages/HomePage';
import { TeamPage } from './pages/TeamPage';
import { ProjectView } from './pages/ProjectView';
import { ScanView } from './pages/ScanView';
import { ScanResultPage } from './pages/ScanResultPage';
import { ReportView } from './pages/ReportView';
import { FalsePositiveReport } from './pages/FalsePositiveReport';
import { TruePositiveReport } from './pages/TruePositiveReport';
import { ProfilePage } from './pages/ProfilePage';
import { NotificationPage } from './pages/NotificationPage';
import { ProtectedRoute } from './components/ProtectedRoute';

export const router = createBrowserRouter([
  {
    path: '/login',
    Component: LoginPage,
  },
  {
    path: '/',
    Component: Layout,
    children: [
      {
        index: true,
        element: React.createElement(ProtectedRoute, null, React.createElement(IntroPage, null)),
      },
      {
        path: 'home',
        element: React.createElement(ProtectedRoute, null, React.createElement(IntroPage, null)),
      },
      {
        path: 'projects',
        element: React.createElement(ProtectedRoute, null, React.createElement(HomePage, null)),
      },
      {
        path: 'team',
        element: React.createElement(ProtectedRoute, null, React.createElement(TeamPage, null)),
      },
      {
        path: 'project/:projectId',
        element: React.createElement(ProtectedRoute, null, React.createElement(ProjectView, null)),
      },
      {
        path: 'project/:projectId/scan/:scanId',
        element: React.createElement(ProtectedRoute, null, React.createElement(ScanResultPage, null)),
      },
      {
        path: 'project/:projectId/scan',
        element: React.createElement(ProtectedRoute, null, React.createElement(ScanView, null)),
      },
      {
        path: 'project/:projectId/report',
        element: React.createElement(ProtectedRoute, null, React.createElement(ReportView, null)),
      },
      {
        path: 'project/:projectId/report/fp',
        element: React.createElement(ProtectedRoute, null, React.createElement(FalsePositiveReport, null)),
      },
      {
        path: 'project/:projectId/report/tp',
        element: React.createElement(ProtectedRoute, null, React.createElement(TruePositiveReport, null)),
      },
      {
        path: 'profile',
        element: React.createElement(ProtectedRoute, null, React.createElement(ProfilePage, null)),
      },
      {
        path: 'notifications',
        element: React.createElement(ProtectedRoute, null, React.createElement(NotificationPage, null)),
      },
      {
        path: 'scans',
        element: React.createElement(ProtectedRoute, null, React.createElement(HomePage, null)),
      },
      {
        path: 'reports',
        element: React.createElement(ProtectedRoute, null, React.createElement(HomePage, null)),
      },
      {
        path: '*',
        element: React.createElement(ProtectedRoute, null, React.createElement(HomePage, null)),
      },
    ],
  },
]);
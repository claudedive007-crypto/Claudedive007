import { Navigate, Route, Routes } from "react-router-dom";
import Layout from "./components/Layout";
import Toaster from "./components/Toaster";

import Dashboard from "./pages/Dashboard";
import ConsentCapture from "./pages/ConsentCapture";
import ConsentDrives from "./pages/ConsentDrives";
import ConsentRepository from "./pages/ConsentRepository";
import ConsentHealth from "./pages/ConsentHealth";
import ValidationEngine from "./pages/ValidationEngine";
import PrivacyCenter from "./pages/PrivacyCenter";
import PreferenceCenter from "./pages/PreferenceCenter";
import Orchestration from "./pages/Orchestration";
import WorkflowBuilder from "./pages/WorkflowBuilder";
import EnterpriseUsage from "./pages/EnterpriseUsage";
import Notifications from "./pages/Notifications";
import AuditCenter from "./pages/AuditCenter";
import Reports from "./pages/Reports";
import AICompliance from "./pages/AICompliance";
import BreachResponse from "./pages/BreachResponse";
import ChildrensData from "./pages/ChildrensData";
import SdfPack from "./pages/SdfPack";
import Administration from "./pages/Administration";
import Developers from "./pages/Developers";
import Settings from "./pages/Settings";

export default function App() {
  return (
    <>
      <Toaster />
      <Routes>
        <Route element={<Layout />}>
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/capture" element={<ConsentCapture />} />
          <Route path="/drives" element={<ConsentDrives />} />
          <Route path="/repository" element={<ConsentRepository />} />
          <Route path="/consent-health" element={<ConsentHealth />} />
          <Route path="/validation" element={<ValidationEngine />} />
          <Route path="/privacy" element={<PrivacyCenter />} />
          <Route path="/preference" element={<PreferenceCenter />} />
          <Route path="/orchestration" element={<Orchestration />} />
          <Route path="/workflows" element={<WorkflowBuilder />} />
          <Route path="/enterprise" element={<EnterpriseUsage />} />
          <Route path="/notifications" element={<Notifications />} />
          <Route path="/audit" element={<AuditCenter />} />
          <Route path="/reports" element={<Reports />} />
          <Route path="/ai" element={<AICompliance />} />
          <Route path="/breach" element={<BreachResponse />} />
          <Route path="/children" element={<ChildrensData />} />
          <Route path="/sdf" element={<SdfPack />} />
          <Route path="/admin" element={<Administration />} />
          <Route path="/developers" element={<Developers />} />
          <Route path="/settings" element={<Settings />} />
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Route>
      </Routes>
    </>
  );
}

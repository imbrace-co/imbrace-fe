import { useParams, useSearchParams } from 'react-router-dom';
import { AIAssistantForm } from "@/pages/AIAssistantManagement/components/aiAssistantForm";

const FormEdit = () => {
    const [searchParams] = useSearchParams();
    const id = searchParams.get('id');
    if(!id) return;
    return <AIAssistantForm id={id} />;
};

export default FormEdit;

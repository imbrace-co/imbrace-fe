'use client';
import { useSearchParams } from 'react-router-dom';
import { AIAssistantForm } from '../../components/aiAssistantForm';

const FormDuplicate = () => {
    const [searchParams] = useSearchParams();
    const id = searchParams.get('id');
    if (!id) return;
    return <AIAssistantForm id={id} isDuplicate={true} />;
};

export default FormDuplicate;

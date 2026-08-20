import { useTranslation } from 'react-i18next';

import styles from './index.module.scss';
interface RoleTagProps {
    role: API.Role | API.TeamRoleType;
    isTeamRole?: boolean;
    prefix?: string;
}
const RoleTagClass = {
    user: styles.agent,
    admin: styles.admin,
    owner: styles.superAdmin,
    member: styles.agent,
    bot: styles.bot,
    technician: styles.admin,
};

const RoleTag = ({ role, isTeamRole, prefix }: RoleTagProps) => {
    const { t } = useTranslation();
    // OSS has only 2 roles: keep 'owner', collapse every other role (admin/user/technician/bot) into "member"
    const displayRole = isTeamRole ? role : role === 'owner' ? 'owner' : 'member';
    return (
        <span className={`${styles.tag} ${RoleTagClass[displayRole] || ''}`}>{`${prefix ? `${prefix} ` : ''}${
            isTeamRole ? t(`team_role_${role}`) : t(`role_${displayRole}`)
        }`}</span>
    );
};

export default RoleTag;

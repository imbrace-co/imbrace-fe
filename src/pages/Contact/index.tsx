import { EllipsisText } from '@imbrace/ui';
import debounce from 'lodash/debounce';
import type { ChangeEvent } from 'react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';

import Avatar from '@/components/Avatar';
import PageLayout from '@/components/PageLayout';
import { FETCH_IN_PROGRESS } from '@/constants/app';
import { fetchContactListThunk } from '@/redux/slices/contact';
import { useAppDispatch, useAppSelector } from '@/redux/store';
import { convertDateToDDMMYYYY } from '@/utils/DateTimeUtils';

import MemberDetail from '../Members/components/MemberDetailV2';
import ContactListTable from './components/ContactListTable';
import styles from './index.module.scss';

const Contacts = () => {
    const { t } = useTranslation();
    const dispatch = useAppDispatch();
    const id = useAppSelector((state) => state.Account.id);
    const [searchInput, setSearchInput] = useState('');
    const [contactDrawer, setContactDrawer] = useState<{ open: boolean; contact?: API.Contact }>({ open: false });
    const contactList = useAppSelector((state) => state.Contact.list);
    const loadingStatus = useAppSelector((state) => state.Contact.loadingStatus);
    const limit = useAppSelector((state) => state.Contact.limit);
    const skip = useAppSelector((state) => state.Contact.skip);
    const total = useAppSelector((state) => state.Contact.total);
    const count = useAppSelector((state) => state.Contact.count);
    const sort = useRef('-created_at');

    const onSearch = useMemo(
        () =>
            debounce((search) => {
                dispatch(fetchContactListThunk({ limit: 10, skip: 0, search, sort: sort.current }));
            }, 200),
        [dispatch],
    );

    useEffect(() => {
        onSearch(searchInput);
    }, [onSearch, searchInput]);

    const handelSort = (property = 'created_at', direction = 'desc') => {
        sort.current = `${direction === 'desc' ? '-' : ''}${property}`;
        dispatch(fetchContactListThunk({ limit, skip, search: searchInput, sort: sort.current }));
    };

    const handleChangePage = (event: ChangeEvent<HTMLInputElement>, page: number) => {
        if (limit * (page - 1) !== skip) {
            dispatch(fetchContactListThunk({ limit, skip: limit * (page - 1), search: searchInput, sort: sort.current }));
        }
    };

    const reload = () => {
        dispatch(fetchContactListThunk({ limit, skip, search: searchInput, sort: sort.current }));
    };

    const columns = [
        {
            id: 'id',
            label: '',
            disableSorter: true,
            disablePadding: true,
            width: 60,
            customize: (key: string, row: API.Contact) => (row.id === id ? <span className={styles.you}>{t('you')}</span> : <span />),
        },
        {
            id: 'display_name',
            label: 'contact_table_header_nickname',
            disableSorter: true,
            customize: (key: string, row: API.Contact) => (
                <div
                    className={styles.avatarContainer}
                    onClick={() => {
                        setContactDrawer({
                            open: true,
                            contact: row,
                        });
                    }}
                >
                    <Avatar
                        avatarUrl={row.avatar_url}
                        isActive
                        displayName={row.display_name}
                        firstName={row.first_name}
                        lastName={row.last_name}
                    />
                    <EllipsisText text={row.display_name || '-'} />
                </div>
            ),
        },
        {
            id: 'first_name',
            label: 'contact_table_header_firstname',
            customize: (key: string, row: API.Contact) => {
                return <EllipsisText text={row.first_name || '-'} />;
            },
        },
        {
            id: 'last_name',
            label: 'contact_table_header_lastname',
            customize: (key: string, row: API.Contact) => {
                return <EllipsisText text={row.last_name || '-'} />;
            },
        },
        {
            id: 'email',
            label: 'contact_table_header_email',
            customize: (key: string, row: API.Contact) => {
                return <EllipsisText text={row.email || '-'} />;
            },
        },
        {
            id: 'phone_number',
            label: 'contact_table_header_phone',
            disableSorter: true,
            customize: (key: string, row: API.Contact) => {
                return <EllipsisText text={row.phone_number || '-'} />;
            },
        },
        {
            id: 'created_at',
            label: 'contact_table_header_created',
            customize: (key: string, row: API.Contact) => {
                const createdAt = row[key as keyof API.Contact];
                if (typeof createdAt === 'string') {
                    return convertDateToDDMMYYYY(createdAt);
                }
                return '';
            },
        },
    ];

    return (
        <>
            <PageLayout title={t('contacts_heading')}>
                <div className={styles.listContainer}>
                    <ContactListTable
                        data={contactList}
                        columns={columns}
                        searchbarInput={searchInput}
                        setSearchbarInput={setSearchInput}
                        pagination={{
                            page: Math.ceil(skip / 10) + 1,
                            rowsPerPage: 10,
                            total,
                            count,
                        }}
                        handleChangePage={handleChangePage}
                        handelSort={handelSort}
                        loading={loadingStatus === FETCH_IN_PROGRESS}
                        reload={reload}
                    />
                </div>
            </PageLayout>
            <MemberDetail
                open={contactDrawer.open}
                user={contactDrawer.contact}
                type="user"
                isEditable
                width={'639px'}
                variant="persistent"
                onClose={() => {
                    setContactDrawer({
                        ...contactDrawer,
                        open: false,
                    });
                }}
                onFinish={(contact) => {
                    setContactDrawer({
                        ...contactDrawer,
                        contact: contact as API.Contact,
                    });
                    reload();
                }}
            />
        </>
    );
};

export default Contacts;

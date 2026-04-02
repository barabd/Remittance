import type { ReactNode } from 'react'
import SpaceDashboardOutlinedIcon from '@mui/icons-material/SpaceDashboardOutlined'
import SyncAltOutlinedIcon from '@mui/icons-material/SyncAltOutlined'
import FactCheckOutlinedIcon from '@mui/icons-material/FactCheckOutlined'
import GppGoodOutlinedIcon from '@mui/icons-material/GppGoodOutlined'
import AccountBalanceOutlinedIcon from '@mui/icons-material/AccountBalanceOutlined'
import CompareArrowsOutlinedIcon from '@mui/icons-material/CompareArrowsOutlined'
import BarChartOutlinedIcon from '@mui/icons-material/BarChartOutlined'
import AdminPanelSettingsOutlinedIcon from '@mui/icons-material/AdminPanelSettingsOutlined'
import ManageSearchOutlinedIcon from '@mui/icons-material/ManageSearchOutlined'
import PeopleOutlineOutlinedIcon from '@mui/icons-material/PeopleOutlineOutlined'
import StorefrontOutlinedIcon from '@mui/icons-material/StorefrontOutlined'
import SavingsOutlinedIcon from '@mui/icons-material/SavingsOutlined'
import HubOutlinedIcon from '@mui/icons-material/HubOutlined'
import RequestQuoteOutlinedIcon from '@mui/icons-material/RequestQuoteOutlined'
import CalculateOutlinedIcon from '@mui/icons-material/CalculateOutlined'
import TableViewOutlinedIcon from '@mui/icons-material/TableViewOutlined'
import MenuBookOutlinedIcon from '@mui/icons-material/MenuBookOutlined'
import AssessmentOutlinedIcon from '@mui/icons-material/AssessmentOutlined'
import AccountBalanceWalletOutlinedIcon from '@mui/icons-material/AccountBalanceWalletOutlined'
import ApiOutlinedIcon from '@mui/icons-material/ApiOutlined'
import SecurityOutlinedIcon from '@mui/icons-material/SecurityOutlined'
import PolicyOutlinedIcon from '@mui/icons-material/PolicyOutlined'
import WorkspacesOutlinedIcon from '@mui/icons-material/WorkspacesOutlined'
import PostAddOutlinedIcon from '@mui/icons-material/PostAddOutlined'
import BlockOutlinedIcon from '@mui/icons-material/BlockOutlined'
import DescriptionOutlinedIcon from '@mui/icons-material/DescriptionOutlined'
import LayersOutlinedIcon from '@mui/icons-material/LayersOutlined'
import CorporateFareOutlinedIcon from '@mui/icons-material/CorporateFareOutlined'
import VpnKeyOutlinedIcon from '@mui/icons-material/VpnKeyOutlined'
import ShieldOutlinedIcon from '@mui/icons-material/ShieldOutlined'
import TuneOutlinedIcon from '@mui/icons-material/TuneOutlined'
import AssignmentTurnedInOutlinedIcon from '@mui/icons-material/AssignmentTurnedInOutlined'
import CloudUploadOutlinedIcon from '@mui/icons-material/CloudUploadOutlined'

export type NavItem = {
  label: string
  to: string
  icon: ReactNode
}

export type NavGroup = {
  title: string
  items: NavItem[]
}

export const navGroups: NavGroup[] = [
  {
    title: 'Overview',
    items: [
      {
        label: 'Dashboard',
        to: '/dashboard',
        icon: <SpaceDashboardOutlinedIcon fontSize="small" />,
      },
      {
        label: 'Operations hub',
        to: '/operations/hub',
        icon: <HubOutlinedIcon fontSize="small" />,
      },
      {
        label: 'Investigation cases',
        to: '/operations/investigation-cases',
        icon: <WorkspacesOutlinedIcon fontSize="small" />,
      },
      {
        label: 'Bulk data hub (#15)',
        to: '/operations/bulk-data-hub',
        icon: <CloudUploadOutlinedIcon fontSize="small" />,
      },
      {
        label: 'Settlement & regulatory',
        to: '/operations/settlement-regulatory',
        icon: <AssessmentOutlinedIcon fontSize="small" />,
      },
    ],
  },
  {
    title: 'Remittance',
    items: [
      {
        label: 'Single entry (abroad)',
        to: '/exchange-house/single-entry',
        icon: <PostAddOutlinedIcon fontSize="small" />,
      },
      {
        label: 'Search & Tracking',
        to: '/remittance/search',
        icon: <ManageSearchOutlinedIcon fontSize="small" />,
      },
      {
        label: 'Approvals Queue',
        to: '/remittance/queue',
        icon: <FactCheckOutlinedIcon fontSize="small" />,
      },
      {
        label: 'Distribution/Disbursement',
        to: '/remittance/disbursement',
        icon: <SyncAltOutlinedIcon fontSize="small" />,
      },
      {
        label: 'Beneficiaries',
        to: '/masters/beneficiaries',
        icon: <PeopleOutlineOutlinedIcon fontSize="small" />,
      },
      {
        label: 'Exchange houses & agents',
        to: '/masters/agents',
        icon: <StorefrontOutlinedIcon fontSize="small" />,
      },
      {
        label: 'Customers',
        to: '/masters/customers',
        icon: <PeopleOutlineOutlinedIcon fontSize="small" />,
      },
      {
        label: 'Block remittance reports',
        to: '/exchange-house/blocked-reports',
        icon: <BlockOutlinedIcon fontSize="small" />,
      },
      {
        label: 'BEFTN acknowledgment files',
        to: '/exchange-house/beftn-ack',
        icon: <DescriptionOutlinedIcon fontSize="small" />,
      },
    ],
  },
  {
    title: 'Compliance',
    items: [
      {
        label: 'AML Alerts',
        to: '/compliance/alerts',
        icon: <GppGoodOutlinedIcon fontSize="small" />,
      },
      {
        label: 'Risk controls',
        to: '/compliance/risk-controls',
        icon: <PolicyOutlinedIcon fontSize="small" />,
      },
      {
        label: 'MLA & screening settings',
        to: '/compliance/mla-settings',
        icon: <TuneOutlinedIcon fontSize="small" />,
      },
      {
        label: 'Rules reference',
        to: '/compliance/rules',
        icon: <MenuBookOutlinedIcon fontSize="small" />,
      },
      {
        label: 'BFIU Reporting (STR/CTR)',
        to: '/compliance/bfiu-reporting',
        icon: <AssessmentOutlinedIcon fontSize="small" />,
      },
    ],
  },
  {
    title: 'Finance & Ops',
    items: [
      {
        label: 'Reconciliation Exceptions',
        to: '/reconciliation/exceptions',
        icon: <CompareArrowsOutlinedIcon fontSize="small" />,
      },
      {
        label: 'Reconciliation slabs (BEFTN/Vostro)',
        to: '/reconciliation/slabs',
        icon: <LayersOutlinedIcon fontSize="small" />,
      },
      {
        label: 'Finance & GL',
        to: '/finance/gl',
        icon: <AccountBalanceOutlinedIcon fontSize="small" />,
      },
      {
        label: 'Cover funds',
        to: '/finance/cover-funds',
        icon: <SavingsOutlinedIcon fontSize="small" />,
      },
      {
        label: 'Pricing & spreads',
        to: '/finance/pricing',
        icon: <RequestQuoteOutlinedIcon fontSize="small" />,
      },
      {
        label: 'FX calculator',
        to: '/tools/fx-converter',
        icon: <CalculateOutlinedIcon fontSize="small" />,
      },
      {
        label: 'Corporate file mapping',
        to: '/tools/corporate-file-mapping',
        icon: <TableViewOutlinedIcon fontSize="small" />,
      },
      {
        label: 'Security utilities',
        to: '/tools/security-utilities',
        icon: <SecurityOutlinedIcon fontSize="small" />,
      },
      {
        label: 'Security & VAPT reference',
        to: '/tools/security-vapt',
        icon: <AssignmentTurnedInOutlinedIcon fontSize="small" />,
      },
      {
        label: 'Incentive distribution',
        to: '/finance/incentive-distribution',
        icon: <AccountBalanceWalletOutlinedIcon fontSize="small" />,
      },
      {
        label: 'Reports',
        to: '/finance/reports',
        icon: <BarChartOutlinedIcon fontSize="small" />,
      },

    ],
  },
  {
    title: 'Integrations (demo)',
    items: [
      {
        label: 'Partner & network hub',
        to: '/integrations/hub',
        icon: <ApiOutlinedIcon fontSize="small" />,
      },
    ],
  },
  {
    title: 'Head office (A.1.4)',
    items: [
      {
        label: 'Head Office module',
        to: '/head-office/module',
        icon: <CorporateFareOutlinedIcon fontSize="small" />,
      },
      {
        label: 'Permissions & limits',
        to: '/head-office/permissions',
        icon: <VpnKeyOutlinedIcon fontSize="small" />,
      },
      {
        label: 'User & Role Management',
        to: '/security/roles',
        icon: <ShieldOutlinedIcon fontSize="small" />,
      },
      {
        label: 'Security audit / Rights',
        to: '/security/user-rights',
        icon: <SecurityOutlinedIcon fontSize="small" />,
      },
    ],
  },
  {
    title: 'Administration',
    items: [
      {
        label: 'Administration',
        to: '/administration',
        icon: <AdminPanelSettingsOutlinedIcon fontSize="small" />,
      },
      {
        label: 'Audit & Monitoring',
        to: '/audit',
        icon: <GppGoodOutlinedIcon fontSize="small" />,
      },
      {
        label: 'Exchange House Bulk Upload',
        to: '/exchange-house/bulk-upload',
        icon: <SyncAltOutlinedIcon fontSize="small" />,
      },
    ],
  },
]


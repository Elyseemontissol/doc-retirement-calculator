// Federal Retirement Benefits Calculator - API Service
// U.S. Department of Commerce

import axios, { AxiosError, InternalAxiosRequestConfig } from 'axios';
import type {
  AuthResponse,
  LoginCredentials,
  User,
  Employee,
  ServicePeriod,
  SalaryRecord,
  SyncResult,
  CalculationRequest,
  CalculationResult,
  ComparisonResult,
  RetirementCase,
  CreateCaseRequest,
  UpdateCaseRequest,
  UpdateCaseStatusRequest,
  AddCaseNoteRequest,
  AddDeterminationRequest,
  GenerateCaseFormRequest,
  CaseNote,
  CoverageDetermination,
  GeneratedForm,
  FormType,
  GenerateFormRequest,
  EducationResource,
  CreateEducationResourceRequest,
  EligibilityReport,
  CasesReport,
  DemographicsReport,
  DashboardReport,
  PaginatedResponse,
} from '../types';

// ---------------------------------------------------------------------------
//  Axios instance
// ---------------------------------------------------------------------------

const TOKEN_KEY = 'retirement_calc_token';

const api = axios.create({
  baseURL: '/api',
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 30_000,
});

// -- Request interceptor: attach JWT --
api.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    const token = localStorage.getItem(TOKEN_KEY);
    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error),
);

// -- Response interceptor: handle 401 --
api.interceptors.response.use(
  (response) => response,
  (error: AxiosError) => {
    if (error.response?.status === 401) {
      localStorage.removeItem(TOKEN_KEY);
      // Redirect to login unless already there
      if (window.location.pathname !== '/login') {
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  },
);

// ---------------------------------------------------------------------------
//  Auth
// ---------------------------------------------------------------------------

export const auth = {
  async login(credentials: LoginCredentials): Promise<AuthResponse> {
    const { data } = await api.post<AuthResponse>('/auth/login', credentials);
    localStorage.setItem(TOKEN_KEY, data.token);
    return data;
  },

  async logout(): Promise<void> {
    try {
      await api.post('/auth/logout');
    } finally {
      localStorage.removeItem(TOKEN_KEY);
    }
  },

  async getMe(): Promise<User> {
    const { data } = await api.get<User>('/auth/me');
    return data;
  },

  getToken(): string | null {
    return localStorage.getItem(TOKEN_KEY);
  },

  isAuthenticated(): boolean {
    return !!localStorage.getItem(TOKEN_KEY);
  },
};

// ---------------------------------------------------------------------------
//  Employees
// ---------------------------------------------------------------------------

export interface EmployeeListParams {
  page?: number;
  limit?: number;
  search?: string;
  retirementPlan?: string;
}

export const employees = {
  async list(params?: EmployeeListParams): Promise<PaginatedResponse<Employee>> {
    const { data } = await api.get<PaginatedResponse<Employee>>('/employees', { params });
    return data;
  },

  async getById(id: string): Promise<Employee> {
    const { data } = await api.get<Employee>(`/employees/${id}`);
    return data;
  },

  async update(id: string, updates: Partial<Employee>): Promise<Employee> {
    const { data } = await api.put<Employee>(`/employees/${id}`, updates);
    return data;
  },

  async getServiceHistory(id: string): Promise<ServicePeriod[]> {
    const { data } = await api.get<ServicePeriod[]>(`/employees/${id}/service-history`);
    return data;
  },

  async getSalaryHistory(id: string): Promise<SalaryRecord[]> {
    const { data } = await api.get<SalaryRecord[]>(`/employees/${id}/salary-history`);
    return data;
  },

  async syncNFC(id: string): Promise<SyncResult> {
    const { data } = await api.post<SyncResult>(`/employees/${id}/sync`);
    return data;
  },
};

// ---------------------------------------------------------------------------
//  Calculations
// ---------------------------------------------------------------------------

export const calculations = {
  async run(request: CalculationRequest): Promise<CalculationResult> {
    const { data } = await api.post<CalculationResult>('/calculations', request);
    return data;
  },

  async getById(id: string): Promise<CalculationResult> {
    const { data } = await api.get<CalculationResult>(`/calculations/${id}`);
    return data;
  },

  async getByEmployee(employeeId: string): Promise<CalculationResult[]> {
    const { data } = await api.get<CalculationResult[]>(
      `/calculations/employee/${employeeId}`,
    );
    return data;
  },

  async compare(scenarios: CalculationRequest[]): Promise<ComparisonResult> {
    const { data } = await api.post<ComparisonResult>('/calculations/compare', {
      scenarios,
    });
    return data;
  },
};

// ---------------------------------------------------------------------------
//  Cases
// ---------------------------------------------------------------------------

export interface CaseListParams {
  status?: string;
  specialistId?: string;
  startDate?: string;
  endDate?: string;
  page?: number;
  limit?: number;
}

export const cases = {
  async list(params?: CaseListParams): Promise<PaginatedResponse<RetirementCase>> {
    const { data } = await api.get<PaginatedResponse<RetirementCase>>('/cases', {
      params,
    });
    return data;
  },

  async create(request: CreateCaseRequest): Promise<RetirementCase> {
    const { data } = await api.post<RetirementCase>('/cases', request);
    return data;
  },

  async getById(id: string): Promise<RetirementCase> {
    const { data } = await api.get<RetirementCase>(`/cases/${id}`);
    return data;
  },

  async update(id: string, updates: UpdateCaseRequest): Promise<RetirementCase> {
    const { data } = await api.put<RetirementCase>(`/cases/${id}`, updates);
    return data;
  },

  async updateStatus(
    id: string,
    statusUpdate: UpdateCaseStatusRequest,
  ): Promise<RetirementCase> {
    const { data } = await api.patch<RetirementCase>(`/cases/${id}/status`, statusUpdate);
    return data;
  },

  async addNote(id: string, note: AddCaseNoteRequest): Promise<CaseNote> {
    const { data } = await api.post<CaseNote>(`/cases/${id}/notes`, note);
    return data;
  },

  async addDetermination(
    id: string,
    determination: AddDeterminationRequest,
  ): Promise<CoverageDetermination> {
    const { data } = await api.post<CoverageDetermination>(
      `/cases/${id}/determinations`,
      determination,
    );
    return data;
  },

  async listForms(id: string): Promise<GeneratedForm[]> {
    const { data } = await api.get<GeneratedForm[]>(`/cases/${id}/forms`);
    return data;
  },

  async generateForm(
    id: string,
    request: GenerateCaseFormRequest,
  ): Promise<GeneratedForm> {
    const { data } = await api.post<GeneratedForm>(`/cases/${id}/forms`, request);
    return data;
  },
};

// ---------------------------------------------------------------------------
//  Forms (standalone)
// ---------------------------------------------------------------------------

export const forms = {
  async getTypes(): Promise<FormType[]> {
    const { data } = await api.get<FormType[]>('/forms/types');
    return data;
  },

  async generate(request: GenerateFormRequest): Promise<GeneratedForm> {
    const { data } = await api.post<GeneratedForm>('/forms/generate', request);
    return data;
  },

  async getById(id: string): Promise<GeneratedForm> {
    const { data } = await api.get<GeneratedForm>(`/forms/${id}`);
    return data;
  },
};

// ---------------------------------------------------------------------------
//  Education resources
// ---------------------------------------------------------------------------

export interface EducationListParams {
  category?: string;
  type?: string;
  search?: string;
}

export const education = {
  async list(params?: EducationListParams): Promise<EducationResource[]> {
    const { data } = await api.get<EducationResource[]>('/education', { params });
    return data;
  },

  async getById(id: string): Promise<EducationResource> {
    const { data } = await api.get<EducationResource>(`/education/${id}`);
    return data;
  },

  async create(
    resource: CreateEducationResourceRequest,
  ): Promise<EducationResource> {
    const { data } = await api.post<EducationResource>('/education', resource);
    return data;
  },
};

// ---------------------------------------------------------------------------
//  Reports
// ---------------------------------------------------------------------------

export const reports = {
  async eligibility(): Promise<EligibilityReport> {
    const { data } = await api.get<EligibilityReport>('/reports/eligibility');
    return data;
  },

  async cases(): Promise<CasesReport> {
    const { data } = await api.get<CasesReport>('/reports/cases');
    return data;
  },

  async demographics(): Promise<DemographicsReport> {
    const { data } = await api.get<DemographicsReport>('/reports/demographics');
    return data;
  },

  async dashboard(): Promise<DashboardReport> {
    const { data } = await api.get<DashboardReport>('/reports/dashboard');
    return data;
  },
};

// ---------------------------------------------------------------------------
//  Default export (all modules)
// ---------------------------------------------------------------------------

const apiService = {
  auth,
  employees,
  calculations,
  cases,
  forms,
  education,
  reports,
};

export default apiService;

package management

import (
	"context"

	"github.com/zitadel/zitadel/internal/api/authz"
	"github.com/zitadel/zitadel/internal/api/grpc/idp"
	"github.com/zitadel/zitadel/internal/api/grpc/object"
	policy_grpc "github.com/zitadel/zitadel/internal/api/grpc/policy"
	"github.com/zitadel/zitadel/internal/api/grpc/user"
	"github.com/zitadel/zitadel/internal/domain"
	"github.com/zitadel/zitadel/internal/query"

	mgmt_pb "github.com/zitadel/zitadel/pkg/grpc/management"
)

func (s *Server) GetLoginPolicy(ctx context.Context, req *mgmt_pb.GetLoginPolicyRequest) (*mgmt_pb.GetLoginPolicyResponse, error) {
	policy, err := s.query.LoginPolicyByID(ctx, authz.GetCtxData(ctx).OrgID)
	if err != nil {
		return nil, err
	}
	return &mgmt_pb.GetLoginPolicyResponse{Policy: policy_grpc.ModelLoginPolicyToPb(policy), IsDefault: policy.IsDefault}, nil
}

func (s *Server) GetDefaultLoginPolicy(ctx context.Context, req *mgmt_pb.GetDefaultLoginPolicyRequest) (*mgmt_pb.GetDefaultLoginPolicyResponse, error) {
	policy, err := s.query.DefaultLoginPolicy(ctx)
	if err != nil {
		return nil, err
	}
	return &mgmt_pb.GetDefaultLoginPolicyResponse{Policy: policy_grpc.ModelLoginPolicyToPb(policy)}, nil
}

func (s *Server) AddCustomLoginPolicy(ctx context.Context, req *mgmt_pb.AddCustomLoginPolicyRequest) (*mgmt_pb.AddCustomLoginPolicyResponse, error) {
	policy, err := s.command.AddLoginPolicy(ctx, authz.GetCtxData(ctx).OrgID, addLoginPolicyToDomain(req))
	if err != nil {
		return nil, err
	}
	return &mgmt_pb.AddCustomLoginPolicyResponse{
		Details: object.AddToDetailsPb(
			policy.Sequence,
			policy.ChangeDate,
			policy.ResourceOwner,
		),
	}, nil
}

func (s *Server) UpdateCustomLoginPolicy(ctx context.Context, req *mgmt_pb.UpdateCustomLoginPolicyRequest) (*mgmt_pb.UpdateCustomLoginPolicyResponse, error) {
	policy, err := s.command.ChangeLoginPolicy(ctx, authz.GetCtxData(ctx).OrgID, updateLoginPolicyToDomain(req))
	if err != nil {
		return nil, err
	}
	return &mgmt_pb.UpdateCustomLoginPolicyResponse{
		Details: object.ChangeToDetailsPb(
			policy.Sequence,
			policy.ChangeDate,
			policy.ResourceOwner,
		),
	}, nil
}

func (s *Server) ResetLoginPolicyToDefault(ctx context.Context, req *mgmt_pb.ResetLoginPolicyToDefaultRequest) (*mgmt_pb.ResetLoginPolicyToDefaultResponse, error) {
	objectDetails, err := s.command.RemoveLoginPolicy(ctx, authz.GetCtxData(ctx).OrgID)
	if err != nil {
		return nil, err
	}
	return &mgmt_pb.ResetLoginPolicyToDefaultResponse{
		Details: object.DomainToChangeDetailsPb(objectDetails),
	}, nil
}

func (s *Server) ListLoginPolicyIDPs(ctx context.Context, req *mgmt_pb.ListLoginPolicyIDPsRequest) (*mgmt_pb.ListLoginPolicyIDPsResponse, error) {
	res, err := s.query.IDPLoginPolicyLinks(ctx, authz.GetCtxData(ctx).OrgID, ListLoginPolicyIDPsRequestToQuery(req))
	if err != nil {
		return nil, err
	}
	return &mgmt_pb.ListLoginPolicyIDPsResponse{
		Result:  idp.IDPLoginPolicyLinksToPb(res.Links),
		Details: object.ToListDetails(res.Count, res.Sequence, res.Timestamp),
	}, nil
}

func (s *Server) AddIDPToLoginPolicy(ctx context.Context, req *mgmt_pb.AddIDPToLoginPolicyRequest) (*mgmt_pb.AddIDPToLoginPolicyResponse, error) {
	idp, err := s.command.AddIDPProviderToLoginPolicy(ctx, authz.GetCtxData(ctx).OrgID, &domain.IDPProvider{IDPConfigID: req.IdpId, Type: idp.IDPProviderTypeFromPb(req.OwnerType)})
	if err != nil {
		return nil, err
	}
	return &mgmt_pb.AddIDPToLoginPolicyResponse{
		Details: object.AddToDetailsPb(
			idp.Sequence,
			idp.ChangeDate,
			idp.ResourceOwner,
		),
	}, nil
}

func (s *Server) RemoveIDPFromLoginPolicy(ctx context.Context, req *mgmt_pb.RemoveIDPFromLoginPolicyRequest) (*mgmt_pb.RemoveIDPFromLoginPolicyResponse, error) {
	idpQuery, err := query.NewIDPUserLinkIDPIDSearchQuery(req.IdpId)
	if err != nil {
		return nil, err
	}
	userLinks, err := s.query.IDPUserLinks(ctx, &query.IDPUserLinksSearchQuery{
		Queries: []query.SearchQuery{idpQuery},
	})
	if err != nil {
		return nil, err
	}
	objectDetails, err := s.command.RemoveIDPProviderFromLoginPolicy(ctx, authz.GetCtxData(ctx).OrgID, &domain.IDPProvider{IDPConfigID: req.IdpId}, user.ExternalIDPViewsToExternalIDPs(userLinks.Links)...)
	if err != nil {
		return nil, err
	}
	return &mgmt_pb.RemoveIDPFromLoginPolicyResponse{
		Details: object.DomainToChangeDetailsPb(objectDetails),
	}, nil
}

func (s *Server) ListLoginPolicySecondFactors(ctx context.Context, req *mgmt_pb.ListLoginPolicySecondFactorsRequest) (*mgmt_pb.ListLoginPolicySecondFactorsResponse, error) {
	result, err := s.query.SecondFactorsByOrg(ctx, authz.GetCtxData(ctx).OrgID)
	if err != nil {
		return nil, err
	}
	return &mgmt_pb.ListLoginPolicySecondFactorsResponse{
		Details: object.ToListDetails(result.Count, result.Sequence, result.Timestamp),
		Result:  policy_grpc.ModelSecondFactorTypesToPb(result.Factors),
	}, nil
}

func (s *Server) AddSecondFactorToLoginPolicy(ctx context.Context, req *mgmt_pb.AddSecondFactorToLoginPolicyRequest) (*mgmt_pb.AddSecondFactorToLoginPolicyResponse, error) {
	_, objectDetails, err := s.command.AddSecondFactorToLoginPolicy(ctx, policy_grpc.SecondFactorTypeToDomain(req.Type), authz.GetCtxData(ctx).OrgID)
	if err != nil {
		return nil, err
	}
	return &mgmt_pb.AddSecondFactorToLoginPolicyResponse{
		Details: object.DomainToAddDetailsPb(objectDetails),
	}, nil
}

func (s *Server) RemoveSecondFactorFromLoginPolicy(ctx context.Context, req *mgmt_pb.RemoveSecondFactorFromLoginPolicyRequest) (*mgmt_pb.RemoveSecondFactorFromLoginPolicyResponse, error) {
	objectDetails, err := s.command.RemoveSecondFactorFromLoginPolicy(ctx, policy_grpc.SecondFactorTypeToDomain(req.Type), authz.GetCtxData(ctx).OrgID)
	if err != nil {
		return nil, err
	}
	return &mgmt_pb.RemoveSecondFactorFromLoginPolicyResponse{
		Details: object.DomainToChangeDetailsPb(objectDetails),
	}, nil
}

func (s *Server) ListLoginPolicyMultiFactors(ctx context.Context, req *mgmt_pb.ListLoginPolicyMultiFactorsRequest) (*mgmt_pb.ListLoginPolicyMultiFactorsResponse, error) {
	res, err := s.query.MultiFactorsByOrg(ctx, authz.GetCtxData(ctx).OrgID)
	if err != nil {
		return nil, err
	}
	return &mgmt_pb.ListLoginPolicyMultiFactorsResponse{
		Details: object.ToListDetails(res.Count, res.Sequence, res.Timestamp),
		Result:  policy_grpc.ModelMultiFactorTypesToPb(res.Factors),
	}, nil
}

func (s *Server) AddMultiFactorToLoginPolicy(ctx context.Context, req *mgmt_pb.AddMultiFactorToLoginPolicyRequest) (*mgmt_pb.AddMultiFactorToLoginPolicyResponse, error) {
	_, objectDetails, err := s.command.AddMultiFactorToLoginPolicy(ctx, policy_grpc.MultiFactorTypeToDomain(req.Type), authz.GetCtxData(ctx).OrgID)
	if err != nil {
		return nil, err
	}
	return &mgmt_pb.AddMultiFactorToLoginPolicyResponse{
		Details: object.DomainToAddDetailsPb(objectDetails),
	}, nil
}

func (s *Server) RemoveMultiFactorFromLoginPolicy(ctx context.Context, req *mgmt_pb.RemoveMultiFactorFromLoginPolicyRequest) (*mgmt_pb.RemoveMultiFactorFromLoginPolicyResponse, error) {
	objectDetails, err := s.command.RemoveMultiFactorFromLoginPolicy(ctx, policy_grpc.MultiFactorTypeToDomain(req.Type), authz.GetCtxData(ctx).OrgID)
	if err != nil {
		return nil, err
	}
	return &mgmt_pb.RemoveMultiFactorFromLoginPolicyResponse{
		Details: object.DomainToChangeDetailsPb(objectDetails),
	}, nil
}
